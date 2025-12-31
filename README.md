<p align="center">
    <a href="https://bunbu.osc.garden">
        <img src="public/pwa-512x512.png" width="200" alt="bunbu logo: the kanji 文 (text) on a blue background">
    </a>
    <br>
    <br>
    <a href="#contributing">
        <img src="https://img.shields.io/badge/PRs-welcome-0?style=flat-square&labelColor=202b2d&color=193773" alt="PRs welcome"></a>
    <a href="https://bunbu.osc.garden">
        <img src="https://img.shields.io/website?url=https%3A%2F%2Fbunbu.osc.garden&style=flat-square&label=app&labelColor=202b2d&color=193773" alt="app status"></a>
    <a href="#license">
        <img src="https://img.shields.io/github/license/welpo/bunbu?style=flat-square&labelColor=202b2d&color=193773" alt="license"></a>
    <a href="https://github.com/welpo/git-sumi">
        <img src="https://img.shields.io/badge/clean_commits-git--sumi-0?style=flat-square&labelColor=202b2d&color=193773" alt="Clean commits"></a>
</p>

<p align="center">
    <a href="https://bunbu.osc.garden">try it now~</a>
</p>

<h3 align="center">analyse the frequency of words in Japanese text</h3>

learning Japanese? wondering which words appear most often in that book, film, or conversation?

paste or load any Japanese text and bunbu will break it down into individual words, showing you how often each one appears. useful for deciding what vocabulary to prioritise, or just satisfying your curiosity〜

## features

- morphological analysis of Japanese text powered by [Goya](https://github.com/Leko/goya)
- word frequency table with counts, percentages, and parts of speech
- furigana for kanji
- links to online dictionaries (Jisho, Weblio, Kotobank, Goo, Wiktionary)
- pronunciation references (Forvo, YouGlish, ImmersionKit) and text-to-speech
- filter results by part of speech (nouns, verbs, adjectives, etc.)
- multiple input methods: paste, type, or import files
- 100% local processing — your text never leaves your device
- works offline as a progressive web app (PWA)
- installable on mobile and desktop

## need help?

something not working? have an idea? let me know!

- questions or ideas → [start a discussion](https://github.com/welpo/bunbu/discussions)
- found a bug? → [report it here](https://github.com/welpo/bunbu/issues/new?labels=bug)
- feature request? → [let me know](https://github.com/welpo/bunbu/issues/new?labels=feature)

## contributing

please do! i'd appreciate bug reports, improvements (however minor), suggestions…

bunbu is built with Astro and TypeScript. to run locally:

1. clone the repository: `git clone https://github.com/welpo/bunbu.git`
2. install dependencies: `npm install`
3. start the dev server: `npm run dev`
4. visit `http://localhost:4321` in your browser

the important files are:

- `src/pages/index.astro`: main page structure
- `src/scripts/main.ts`: application logic
- `src/components/`: UI components (modals, inputs, etc.)
- `public/workers/`: web worker for text analysis
- `public/assets/js/`: Goya WASM engine (see [Goya build guide](public/assets/js/goya/README.md))

## license

bunbu is free software: you can redistribute it and/or modify it under the terms of the [GNU Affero General Public License as published by the Free Software Foundation](./COPYING), either version 3 of the license, or (at your option) any later version.
