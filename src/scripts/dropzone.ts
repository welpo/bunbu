export interface DropzoneLoadEvent {
    text: string;
    loadedFiles: string[];
    skippedFiles: string[];
}

export interface DropzoneErrorEvent {
    message: string;
}

async function isTextFile(file: File): Promise<boolean> {
    const chunk = file.slice(0, 8192);
    const buffer = await chunk.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    for (const byte of bytes) {
        if (byte === 0) return false;
        if (byte < 9) return false;
        if (byte > 13 && byte < 32 && byte !== 27) return false;
    }
    return true;
}

async function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsText(file);
    });
}

export function initDropzone(element: Element): void {
    element.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.stopPropagation();
        element.classList.add("dragover");
    });

    element.addEventListener("dragleave", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const relatedTarget = (event as DragEvent).relatedTarget as Node | null;
        if (!element.contains(relatedTarget)) {
            element.classList.remove("dragover");
        }
    });

    element.addEventListener("drop", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        element.classList.remove("dragover");

        const dragEvent = event as DragEvent;
        if (!dragEvent.dataTransfer) return;

        const files = Array.from(dragEvent.dataTransfer.files);
        if (files.length === 0) return;

        const textFiles: File[] = [];
        const skippedFiles: File[] = [];
        for (const file of files) {
            if (await isTextFile(file)) {
                textFiles.push(file);
            } else {
                skippedFiles.push(file);
            }
        }

        if (textFiles.length === 0) {
            element.dispatchEvent(
                new CustomEvent<DropzoneErrorEvent>("dropzone:error", {
                    detail: {
                        message: `No text files found. Skipped: ${skippedFiles.map((f) => f.name).join(", ")}`,
                    },
                })
            );
            return;
        }

        try {
            const texts = await Promise.all(textFiles.map(readFileAsText));
            const combinedText = texts.join("\n");

            element.dispatchEvent(
                new CustomEvent<DropzoneLoadEvent>("dropzone:load", {
                    detail: {
                        text: combinedText,
                        loadedFiles: textFiles.map((f) => f.name),
                        skippedFiles: skippedFiles.map((f) => f.name),
                    },
                })
            );
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            element.dispatchEvent(
                new CustomEvent<DropzoneErrorEvent>("dropzone:error", {
                    detail: { message: `Error reading files: ${errorMessage}` },
                })
            );
        }
    });

    // Prevent browser default drop behavior
    document.addEventListener("dragover", (event) => event.preventDefault());
    document.addEventListener("drop", (event) => event.preventDefault());
}
