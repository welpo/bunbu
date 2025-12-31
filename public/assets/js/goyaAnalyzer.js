// @ts-check
import * as goya from "./goya/goya_core.js";
import * as goyaFeatures from "./goya/goya_features.js";

let goyaInitialized = false;
let featuresInitialized = false;

async function initGoya() {
    if (!goyaInitialized) {
        await goya.default();
        goyaInitialized = true;
    }
    if (!featuresInitialized) {
        await goyaFeatures.default();
        featuresInitialized = true;
    }
}

/**
 * @param {string[]} feature
 * @param {number} index
 * @param {string} defaultValue
 * @returns {string}
 */
function getFeatureOrDefault(feature, index, defaultValue) {
    return feature[index] !== "*" ? feature[index] : defaultValue;
}

/**
 * @typedef {Object} WordAnalysis
 * @property {string} dictForm
 * @property {number} count
 * @property {string} pos
 * @property {string} [reading]
 */

/**
 * @param {string} text
 * @returns {Promise<WordAnalysis[]>}
 */
async function analyzeText(text) {
    await initGoya();
    const lattice = goya.parse(text);
    const tokens = lattice.find_best();
    const features = goyaFeatures.get_features(tokens.map((token) => token.wid));
    /** @type {Map<string, { count: number; readings: Map<string, number> }>} */
    const wordData = new Map();

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const feature = features[i];
        const surface = token.surface_form;
        const dictForm = getFeatureOrDefault(feature, 6, surface);
        const pos = feature[0];

        // Skip whitespace
        if (isWhitespace(surface)) continue;

        const key = `${dictForm}|${pos}`;
        let wordInfo = wordData.get(key);
        if (!wordInfo) {
            wordInfo = { count: 0, readings: new Map() };
            wordData.set(key, wordInfo);
        }
        wordInfo.count++;

        let reading = getFeatureOrDefault(feature, 7, "");
        // Important: Get the correct reading for the dictionary form.
        // This is crucial for inflected words (e.g., verbs, adjectives) where the surface form differs from the dictionary form.
        // Example: 「食べた」 (surface: たべた) -> 「食べる」  (dict form: たべる)
        // This ensures correct furigana matching for dictionary forms with okurigana.
        if (containsKanji(dictForm) && dictForm !== surface && reading) {
            const dictFormLattice = goya.parse(dictForm);
            const dictFormTokens = dictFormLattice.find_best();
            const dictFormFeatures = goyaFeatures.get_features(
                dictFormTokens.map((token) => token.wid)
            );
            reading = getFeatureOrDefault(dictFormFeatures[0], 7, reading);
        }
        if (reading) {
            wordInfo.readings.set(reading, (wordInfo.readings.get(reading) || 0) + 1);
        }
    }

    return Array.from(wordData.entries())
        .map(([key, info]) => {
            const [dictForm, pos] = key.split("|");
            /** @type {WordAnalysis} */
            const result = { dictForm, count: info.count, pos };
            if (info.readings.size > 0) {
                result.reading = Array.from(info.readings.entries()).reduce((a, b) =>
                    a[1] > b[1] ? a : b
                )[0];
            }
            return result;
        })
        .sort((a, b) => b.count - a.count);
}

/**
 * @param {string} str
 * @returns {boolean}
 */
function containsKanji(str) {
    return /[\u4E00-\u9FAF]/.test(str);
}

/**
 * @param {string} str
 * @returns {boolean}
 */
function isWhitespace(str) {
    return /^\s*$/.test(str);
}

export { analyzeText, initGoya };
