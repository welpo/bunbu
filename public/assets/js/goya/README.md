# Goya Installation and WASM/JS Build Guide

How to generate the WebAssembly (WASM) and JavaScript files in this directory.

## Installation Steps

1. Install `wasm-pack`:

   ```bash
   cargo install wasm-pack
   ```

2. Clone the [Goya](https://github.com/Leko/goya) repository:

   ```bash
   git clone https://github.com/Leko/goya.git
   cd goya
   ```

3. Download and extract the [MeCab](https://taku910.github.io/mecab/) IPA dictionary:

   ```bash
   curl -L 'https://drive.google.com/uc?export=download&id=0B4y35FiV1wh7MWVlSDBCSXZMTXM' -o mecab-ipadic.tar.gz
   tar -zxvf mecab-ipadic.tar.gz
   rm mecab-ipadic.tar.gz
   ```

4. Compile the dictionary:

   ```bash
   cargo run -p goya-cli --release -- compile mecab-ipadic-2.7.0-20070801
   ```

5. Build the dictionary data:

   ```bash
   ./scripts/build-dict mecab-ipadic-2.7.0-20070801
   ```

6. Build the WebAssembly modules:

   ```bash
   ./scripts/build-wasm wasm-core
   ./scripts/build-wasm wasm-features
   ```

## Locating the built files

### Standalone web use

The WASM and JS files for **standalone web use** can be found in the following directories:

- `goya/wasm-core/pkg/web`
- `goya/wasm-features/pkg/web`

### Node.js

The WASM and JS files for **Node.js** can be found in the following directories:

- `goya/wasm-core/pkg/nodejs`
- `goya/wasm-features/pkg/nodejs`
