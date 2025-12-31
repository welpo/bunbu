// @ts-check
import { initGoya, analyzeText as analyzeTextGoya } from "../assets/js/goyaAnalyzer.js";

/**
 * @typedef {'initialize' | 'analyze'} WorkerAction
 * @typedef {'ok' | 'failed' | 'loading'} WorkerStatus
 * @typedef {Object} WorkerResponse
 * @property {WorkerAction} action
 * @property {WorkerStatus} status
 * @property {import('../assets/js/goyaAnalyzer.js').WordAnalysis[]} [result]
 * @property {string} [error]
 */

/**
 * @param {WorkerResponse} response
 */
const postResponse = (response) => {
    postMessage(response);
};

const initializeGoya = async () => {
    postResponse({
        action: "analyze",
        status: "loading",
    });
    try {
        await initGoya();
        postResponse({ action: "initialize", status: "ok" });
    } catch (error) {
        console.error("Failed to initialize WASM:", error);
        postResponse({
            action: "initialize",
            status: "failed",
            error: String(error),
        });
    }
};

/**
 * @param {string} text
 */
const analyzeText = async (text = "") => {
    postResponse({
        action: "analyze",
        status: "loading",
    });
    try {
        const result = await analyzeTextGoya(text);
        postResponse({
            action: "analyze",
            status: "ok",
            result: result,
        });
    } catch (error) {
        postResponse({
            action: "analyze",
            status: "failed",
            error: String(error),
        });
    }
};

onmessage = async (event) => {
    const { action, payload } = event.data;
    if (action === "initialize") await initializeGoya();
    else if (action === "analyze") await analyzeText(payload);
};
