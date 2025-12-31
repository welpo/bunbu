import {
    type AnalysisResult,
    type ColumnDefinition,
    type FilterOptions,
    type WordAnalysis,
    type WorkerResponse,
} from "./types";
import {
    initDropzone,
    type DropzoneLoadEvent,
    type DropzoneErrorEvent,
} from "./dropzone";

const worker = new Worker("/workers/goya.worker.js", { type: "module" });
worker.postMessage({ action: "initialize" });

const DEMO_TEXT = `「わざわざ人の嫌がるようなことを云ったり、したりするんです。そうでもしなければ僕の存在を人に認めさせる事が出来ないんです。僕は無能です。仕方がないからせめて人に嫌われてでもみようと思うのです。」
— 夏目漱石`;

const WARNING_LENGTH = 2000;
const LONG_TEXT_WARNING =
    "⚠️ this is a long text! processing may be slow, and your browser might even crash. be advised!";
const KANJI_REGEX = /[\u4E00-\u9FAF]/;
const ALL_KANJI_REGEX = /^[\u4E00-\u9FAF]+$/;
const HIRAGANA_SPLIT_REGEX = /([ぁ-ん]+)/;

function matchReadingToWord(word: string | null, reading: string | null): string {
    if (word == null || reading == null) {
        return word || "";
    }
    if (!KANJI_REGEX.test(word)) {
        return word;
    }
    if (ALL_KANJI_REGEX.test(word)) {
        return wrapInRuby(word, katakanaToHiragana(reading));
    }

    const hiraganaReading = katakanaToHiragana(reading);
    const parts = word.split(HIRAGANA_SPLIT_REGEX);
    const resultParts: string[] = [];
    let readingIndex = 0;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i % 2 === 0 && part) {
            // Kanji part.
            let kanjiReading = "";
            if (i + 1 < parts.length) {
                // Find the reading up to the next okurigana.
                const nextOkurigana = parts[i + 1];
                const okuriganaIndex = hiraganaReading.indexOf(
                    nextOkurigana,
                    readingIndex
                );
                if (okuriganaIndex !== -1) {
                    kanjiReading = hiraganaReading.slice(readingIndex, okuriganaIndex);
                    readingIndex = okuriganaIndex;
                }
            } else {
                // Last kanji part, use the rest of the reading.
                kanjiReading = hiraganaReading.slice(readingIndex);
            }
            resultParts.push(wrapInRuby(part, kanjiReading));
        } else {
            // Okurigana part.
            resultParts.push(part);
            readingIndex += part.length;
        }
    }

    return resultParts.join("");
}

/**
 * Converts katakana to hiragana.
 *
 * In Unicode, hiragana characters range from U+3041 to U+3096,
 * while katakana characters range from U+30A1 to U+30F6.
 * The difference between corresponding characters is always 0x60 (96 in decimal).
 *
 * This function subtracts 0x60 to the character code of each katakana character
 * to get its hiragana equivalent.
 */
const katakanaToHiragana = (str: string): string =>
    str.replace(/[ァ-ン]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));

function wrapInRuby(text: string, reading: string): string {
    return `<ruby>${text}<rt>${reading}</rt></ruby>`;
}

document.addEventListener("DOMContentLoaded", () => {
    const analyzeButton = document.getElementById("analyzeButton")!;
    const buttonText = analyzeButton.querySelector(".button-text")!;
    const checkAllButton = document.getElementById("checkAllButton")!;
    const recommendedOptionsButton = document.getElementById(
        "recommendedOptionsButton"
    )!;
    const exportButton = document.getElementById("exportButton")!;
    const inputText = document.getElementById("inputText") as HTMLTextAreaElement;
    const loadDemoButton = document.getElementById("loadDemoButton")!;
    const pasteButton = document.getElementById("pasteClipboardButton")!;
    const fileButton = document.getElementById("importFileButton")!;
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    const textInputDropzone = document.querySelector(".text-input-dropzone")!;
    const resultDiv = document.getElementById("result")!;
    const showFuriganaCheckbox = document.getElementById(
        "showFurigana"
    ) as HTMLInputElement;
    const totalWordsP = document.getElementById("totalWords")!;
    const uncheckAllButton = document.getElementById("uncheckAllButton")!;
    const warningMessage = document.getElementById("warningMessage")!;
    const wordListContainer = document.getElementById("wordListContainer")!;

    let allWords: WordAnalysis[] = [];
    let analysisResult: AnalysisResult | null = null;

    let isAnalyzing = false;
    let isWasmLoaded = false;
    let isTTSSupported = false;
    let japaneseVoice: SpeechSynthesisVoice | null = null;

    function getJapaneseVoices(): SpeechSynthesisVoice[] {
        const voices = speechSynthesis.getVoices();
        let japaneseVoices = voices
            .filter(
                (voice) =>
                    voice.lang === "ja-JP" ||
                    voice.lang === "ja" ||
                    // Fix for Android.
                    voice.name.toLowerCase().includes("japanese")
            )
            // Prefer "enhanced" voices.
            .sort(
                (a, b) =>
                    Number(b.name.toLowerCase().includes("enhanced")) -
                    Number(a.name.toLowerCase().includes("enhanced"))
            );
        // Prefer regular compact over super-compact when both are available.
        const hasCompactAndSuperCompact =
            japaneseVoices.some(
                (v) =>
                    v.voiceURI?.includes("compact") &&
                    !v.voiceURI?.includes("super-compact")
            ) && japaneseVoices.some((v) => v.voiceURI?.includes("super-compact"));
        if (hasCompactAndSuperCompact) {
            japaneseVoices = japaneseVoices.filter(
                (voice) => !voice.voiceURI?.includes("super-compact")
            );
        }
        return japaneseVoices;
    }

    async function initTTS(): Promise<void> {
        if (!("speechSynthesis" in window)) {
            return;
        }
        // Wait for voices to load.
        await new Promise<void>((resolve) => {
            if (speechSynthesis.getVoices().length) {
                resolve();
            } else {
                speechSynthesis.onvoiceschanged = () => resolve();
            }
        });
        const japaneseVoices = getJapaneseVoices();
        if (japaneseVoices.length > 0) {
            japaneseVoice = japaneseVoices[0];
            isTTSSupported = true;
        }
    }

    initTTS();

    function speakWord(word: string): void {
        if (isTTSSupported && japaneseVoice) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.voice = japaneseVoice;
            utterance.lang = "ja-JP";
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    }

    function updateAnalyzeButtonState(): void {
        const hasText = inputText.value.trim() !== "";
        if (!isWasmLoaded) {
            buttonText.textContent = "loading required files...";
            analyzeButton.setAttribute("disabled", "");
            analyzeButton.setAttribute("aria-busy", "true");
            analyzeButton.setAttribute("data-state", "loading");
        } else if (isAnalyzing) {
            buttonText.textContent = "analysing...";
            analyzeButton.setAttribute("disabled", "");
            analyzeButton.setAttribute("aria-busy", "true");
            analyzeButton.setAttribute("data-state", "analysing");
        } else if (!hasText) {
            buttonText.textContent = "enter text to analyse";
            analyzeButton.setAttribute("disabled", "");
            analyzeButton.removeAttribute("aria-busy");
            analyzeButton.setAttribute("data-state", "no-text");
        } else {
            buttonText.textContent = "analyse";
            analyzeButton.removeAttribute("disabled");
            analyzeButton.removeAttribute("aria-busy");
            analyzeButton.removeAttribute("data-state");
        }
    }

    function updateTextWarning(text: string, skippedFiles: string[] = []): void {
        if (text.length > WARNING_LENGTH) {
            warningMessage.innerText = LONG_TEXT_WARNING;
            warningMessage.classList.remove("hidden");
            inputText.classList.add("warning");
        } else if (skippedFiles.length > 0) {
            warningMessage.innerText = `Some files were skipped: ${skippedFiles.join(", ")}`;
            warningMessage.classList.remove("hidden");
            inputText.classList.remove("warning");
        } else {
            warningMessage.classList.add("hidden");
            inputText.classList.remove("warning");
        }
    }

    // Initial button state.
    updateAnalyzeButtonState();

    const handleGoyaInit = (): void => {
        isWasmLoaded = true;
        updateAnalyzeButtonState();
    };

    const handleGoyaInitFailed = (error: string): void => {
        console.error("Failed to initialize GOYA:", error);
        buttonText.textContent = "Failed to load dictionary";
        analyzeButton.setAttribute("disabled", "");
    };

    const handleAnalyzeText = (result: WordAnalysis[]): void => {
        allWords = result;
        const filteredResult = applyFilters(result, getFilterOptions());
        displayResult(filteredResult);
        isAnalyzing = false;
        updateAnalyzeButtonState();
    };

    const handleAnalyzeTextFailed = (error: string): void => {
        console.error("Analysis error:", error);
        resultDiv.textContent = `Error: ${error}`;
        isAnalyzing = false;
        updateAnalyzeButtonState();
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { action, status, result, error } = event.data;
        if (action === "initialize") {
            if (status === "ok") return handleGoyaInit();
            if (status === "failed")
                return handleGoyaInitFailed(error ?? "Unknown error");
        } else if (action === "analyze") {
            if (status === "ok" && result) return handleAnalyzeText(result);
            if (status === "failed")
                return handleAnalyzeTextFailed(error ?? "Unknown error");
        }
    };

    worker.onerror = function (error: ErrorEvent): void {
        console.error("Worker error:", error);
    };

    const filterOptionIds = [
        "includeNonJapanese",
        "includeUnknown",
        "include名詞",
        "include動詞",
        "include形容詞",
        "include副詞",
        "include連体詞",
        "include接続詞",
        "include感動詞",
        "includeフィラー",
        "include助詞",
        "include助動詞",
        "include接頭詞",
        "include記号",
    ] as const;

    const filterOptions: Record<string, HTMLInputElement> = {};
    filterOptionIds.forEach((id) => {
        const element = document.getElementById(id) as HTMLInputElement | null;
        if (element) {
            filterOptions[id] = element;
        } else {
            console.warn(`Element with id "${id}" not found in the DOM.`);
        }
    });

    function setRecommendedOptions(): void {
        Object.values(filterOptions).forEach((checkbox) => (checkbox.checked = false));
        if (filterOptions.include名詞) filterOptions.include名詞.checked = true;
        if (filterOptions.include動詞) filterOptions.include動詞.checked = true;
        if (filterOptions.include形容詞) filterOptions.include形容詞.checked = true;
        if (filterOptions.includeUnknown) filterOptions.includeUnknown.checked = true;
        if (filterOptions.include副詞) filterOptions.include副詞.checked = true;
        updateResultsIfAnalyzed();
        if (filterOptions.include連体詞) filterOptions.include連体詞.checked = true;
    }

    function checkAllOptions(): void {
        Object.values(filterOptions).forEach((checkbox) => (checkbox.checked = true));
        updateResultsIfAnalyzed();
    }

    function uncheckAllOptions(): void {
        Object.values(filterOptions).forEach((checkbox) => (checkbox.checked = false));
        updateResultsIfAnalyzed();
    }

    function updateResultsIfAnalyzed(): void {
        if (allWords.length > 0) {
            const filteredResult = applyFilters(allWords, getFilterOptions());
            displayResult(filteredResult);
        }
    }

    // Set initial default state.
    setRecommendedOptions();

    inputText.addEventListener("input", () => {
        updateTextWarning(inputText.value);
        updateAnalyzeButtonState();
    });

    loadDemoButton.addEventListener("click", () => {
        inputText.value = DEMO_TEXT;
        updateTextWarning(DEMO_TEXT);
        updateAnalyzeButtonState();
    });

    pasteButton.addEventListener("click", async () => {
        const text = await navigator.clipboard.readText();
        inputText.value = text;
        updateTextWarning(text);
        updateAnalyzeButtonState();
    });

    fileButton.addEventListener("click", async () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        if (files.length === 0) return;
        try {
            const texts = await Promise.all(files.map(readFileAsText));
            const combinedText = texts.join("\n");
            inputText.value = combinedText;
            updateTextWarning(combinedText);
            updateAnalyzeButtonState();
        } catch (error) {
            console.error("Error reading files:", error);
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            warningMessage.innerText = `Error reading files: ${errorMessage}`;
            warningMessage.classList.remove("hidden");
        }
    });

    async function readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () =>
                reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsText(file);
        });
    }

    // Initialize dropzone and handle events
    initDropzone(textInputDropzone);

    textInputDropzone.addEventListener("dropzone:load", (event) => {
        const { text, skippedFiles } = (event as CustomEvent<DropzoneLoadEvent>).detail;

        inputText.value = text;
        updateTextWarning(text, skippedFiles);
        updateAnalyzeButtonState();
    });

    textInputDropzone.addEventListener("dropzone:error", (event) => {
        const { message } = (event as CustomEvent<DropzoneErrorEvent>).detail;
        warningMessage.innerText = message;
        warningMessage.classList.remove("hidden");
        inputText.classList.remove("warning");
    });

    recommendedOptionsButton.addEventListener("click", setRecommendedOptions);
    checkAllButton.addEventListener("click", checkAllOptions);
    uncheckAllButton.addEventListener("click", uncheckAllOptions);

    analyzeButton.addEventListener("click", async () => {
        const text = inputText.value;
        if (text.trim() === "") {
            resultDiv.textContent = "Please enter some text to analyze.";
            resultDiv.classList.remove("hidden");
            return;
        }

        isAnalyzing = true;
        updateAnalyzeButtonState();

        worker.postMessage({ action: "analyze", payload: text });
    });

    function getFilterOptions(): FilterOptions {
        return Object.fromEntries(
            Object.entries(filterOptions)
                .filter(([, element]) => element !== null)
                .map(([key, element]) => [key, element.checked])
        ) as unknown as FilterOptions;
    }

    function applyFilters(
        words: WordAnalysis[],
        options: FilterOptions
    ): WordAnalysis[] {
        return words.filter((word) => {
            const { dictForm, pos } = word;

            // Unknown words.
            if (pos === "未知語") {
                return options.includeUnknown;
            }

            // Punctuation.
            if (pos === "記号") {
                return options.include記号;
            }

            // Non-Japanese characters.
            if (!isJapaneseWord(dictForm)) {
                return options.includeNonJapanese;
            }

            // All other Japanese words.
            const posOption = `include${pos}` as keyof FilterOptions;
            return options[posOption] === true;
        });
    }

    function isJapaneseWord(word: string): boolean {
        // Hiragana, katakana, kanji, and prolonged sound mark (ー).
        return /^[ぁ-んァ-ン一-龯ー]*$/.test(word);
    }

    function displayResult(result: WordAnalysis[]): void {
        analysisResult = result as AnalysisResult;
        const totalWords = allWords.reduce((sum, item) => sum + item.count, 0);
        const totalUniqueWords = allWords.length;
        const filteredWords = result.reduce((sum, item) => sum + item.count, 0);
        const filteredUniqueWords = result.length;
        totalWordsP.innerHTML = `Total words: ${totalWords} | Unique words: ${totalUniqueWords}<br>
                                 Filtered words: ${filteredWords} | Filtered unique words: ${filteredUniqueWords}`;
        analysisResult.totalWords = filteredWords;
        resultDiv.classList.remove("hidden");
        updateWordList();
    }

    function createTable(
        data: WordAnalysis[],
        columns: ColumnDefinition[]
    ): HTMLTableElement {
        const table = document.createElement("table");
        table.className = "results-table";

        const cellClassMap: Record<string, string> = {
            dictForm: "word",
            count: "count",
            percentage: "percent",
            pos: "pos",
            pronunciation: "actions",
            definition: "actions",
        };

        // Create header.
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        columns.forEach((column) => {
            const th = document.createElement("th");
            th.textContent = column.header;
            const cellClass = cellClassMap[column.key];
            if (cellClass) {
                th.classList.add(cellClass);
            }
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body.
        const tbody = document.createElement("tbody");
        data.forEach((item) => {
            const row = document.createElement("tr");
            columns.forEach((column) => {
                const td = document.createElement("td");
                const value =
                    column.key in item
                        ? item[column.key as keyof WordAnalysis]
                        : item.dictForm;
                td.innerHTML = column.render(value, item);
                const cellClass = cellClassMap[column.key];
                if (cellClass) {
                    td.classList.add(cellClass);
                }
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        if (isTTSSupported) {
            const ttsButtons = table.querySelectorAll(".tts-button");
            ttsButtons.forEach((button) => {
                button.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const word = (event.target as HTMLElement).getAttribute(
                        "data-word"
                    );
                    if (word) speakWord(word);
                });
            });
        }

        return table;
    }

    function createIconLink(word: string, site: string): string {
        const encodedWord = encodeURIComponent(word);
        const urls: Record<string, string> = {
            forvo: `https://forvo.com/word/${encodedWord}/#ja`,
            youglish: `https://youglish.com/pronounce/${encodedWord}/japanese`,
            jisho: `https://jisho.org/search/${encodedWord}`,
            weblio: `https://ejje.weblio.jp/content/${encodedWord}`,
            kotobank: `https://kotobank.jp/word/${encodedWord}`,
            goo: `https://dictionary.goo.ne.jp/word/${encodedWord}`,
            immersionkit: `https://www.immersionkit.com/dictionary?keyword=${encodedWord}&sort=sentence_length:asc`,
            wiktionary: `https://en.wiktionary.org/wiki/${encodedWord}#Japanese`,
        };
        return `<a href="${urls[site]}" target="_blank" title="${site}" class="icon-link"><img src="/assets/images/logos/${site}.png" alt="${site}" class="link-icon"></a>`;
    }

    function createColumnDefinitions(options: {
        showFurigana: boolean;
    }): ColumnDefinition[] {
        return [
            {
                key: "dictForm",
                header: "word",
                render: (word, item) =>
                    options.showFurigana
                        ? matchReadingToWord(word as string, item.reading ?? null)
                        : (word as string),
            },
            { key: "count", header: "count", render: (count) => String(count) },
            {
                key: "percentage",
                header: "%",
                render: (_, item) =>
                    ((item.count / (analysisResult?.totalWords ?? 1)) * 100).toFixed(
                        2
                    ) + "%",
            },
            {
                key: "pos",
                header: "part of speech",
                render: (pos) => String(pos),
            },
            {
                key: "pronunciation",
                header: "pronunciation",
                render: (_, item) => {
                    const word = item.dictForm;
                    let html = "";
                    if (isTTSSupported) {
                        html += `<button class="tts-button" title="play synthetic voice" data-word="${word}">🔊</button>`;
                    }
                    html +=
                        createIconLink(word, "forvo") +
                        createIconLink(word, "youglish") +
                        createIconLink(word, "immersionkit");
                    return html;
                },
            },
            {
                key: "definition",
                header: "definition",
                render: (_, item) => {
                    const word = item.dictForm;
                    return (
                        createIconLink(word, "jisho") +
                        createIconLink(word, "weblio") +
                        createIconLink(word, "kotobank") +
                        createIconLink(word, "goo") +
                        createIconLink(word, "wiktionary")
                    );
                },
            },
        ];
    }

    function updateWordList(): void {
        wordListContainer.innerHTML = "";

        const options = {
            showFurigana: showFuriganaCheckbox.checked,
        };

        const columnDefinitions = createColumnDefinitions(options);
        const table = createTable(analysisResult ?? [], columnDefinitions);
        wordListContainer.appendChild(table);
    }

    showFuriganaCheckbox.addEventListener("change", () => {
        if (analysisResult) {
            updateWordList();
        }
    });

    Object.values(filterOptions).forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            if (allWords.length > 0) {
                const filteredResult = applyFilters(allWords, getFilterOptions());
                displayResult(filteredResult);
            }
        });
    });

    exportButton.addEventListener("click", () => {
        if (analysisResult) exportToCSV(analysisResult);
    });

    function exportToCSV(data: AnalysisResult): void {
        const fields = [
            { key: "dictForm", header: "dictionary form" },
            { key: "count", header: "count" },
            { key: "percentage", header: "percentage" },
            { key: "pos", header: "part of speech" },
        ];

        const csvContent = [
            fields.map((field) => field.header).join(";"),
            ...data.map((item) =>
                fields
                    .map((field) => {
                        if (field.key === "percentage") {
                            return (
                                (
                                    (item.count / (analysisResult?.totalWords ?? 1)) *
                                    100
                                ).toFixed(2) + "%"
                            );
                        }
                        return item[field.key as keyof WordAnalysis];
                    })
                    .join(";")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);

            // Generate timestamp.
            const now = new Date();
            const timestamp = now
                .toISOString()
                .replace(/T/, "-")
                .replace(/:/g, ".")
                .slice(0, -5);

            const filename = `bunbu-analysis-${timestamp}.csv`;

            link.setAttribute("download", filename);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
});
