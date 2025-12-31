// Worker message types
export type WorkerAction = "initialize" | "analyze";
export type WorkerStatus = "ok" | "failed" | "loading";

export interface WorkerMessage {
    action: WorkerAction;
    payload?: string;
}

export interface WorkerResponse {
    action: WorkerAction;
    status: WorkerStatus;
    result?: WordAnalysis[];
    error?: string;
}

// Analysis result from worker
export interface WordAnalysis {
    dictForm: string;
    count: number;
    pos: string;
    reading?: string;
}

// Extended result with computed fields
export interface AnalysisResult extends Array<WordAnalysis> {
    totalWords?: number;
}

// Filter options
export interface FilterOptions {
    includeNonJapanese: boolean;
    includeUnknown: boolean;
    include名詞: boolean;
    include動詞: boolean;
    include形容詞: boolean;
    include副詞: boolean;
    include連体詞: boolean;
    include接続詞: boolean;
    include感動詞: boolean;
    includeフィラー: boolean;
    include助詞: boolean;
    include助動詞: boolean;
    include接頭詞: boolean;
    include記号: boolean;
}

// Column definition for table rendering
export interface ColumnDefinition {
    key: string;
    header: string;
    render: (value: unknown, item: WordAnalysis) => string;
}

// Part of speech display language
export type PosDisplayLanguage = "english" | "japanese" | "both";

// Part of speech mapping (Japanese → English)
export const POS_MAP: Record<string, string> = {
    名詞: "Noun",
    動詞: "Verb",
    形容詞: "Adjective",
    副詞: "Adverb",
    連体詞: "Pre-noun",
    接続詞: "Conjunction",
    感動詞: "Interjection",
    フィラー: "Filler",
    助詞: "Particle",
    助動詞: "Aux. Verb",
    接頭詞: "Prefix",
    記号: "Punctuation",
} as const;

// Format POS based on display language setting
export function formatPos(pos: string, language: PosDisplayLanguage): string {
    const english = POS_MAP[pos];
    if (!english) return pos; // Unknown POS, return as-is

    switch (language) {
        case "english":
            return english;
        case "japanese":
            return pos;
        case "both":
            return `${english} (${pos})`;
    }
}
