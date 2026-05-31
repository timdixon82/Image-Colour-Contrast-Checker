import { readFileSync } from 'fs';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    {
      // js-clipper/clipper.js contains a Latin-1 byte (0xb9, superscript-1 in a
      // comment) that Rolldown (Vite 6+) rejects as non-UTF-8. Rollup 5 was
      // permissive; Rolldown is strict. Re-reading the file as latin1 maps each
      // byte to the matching Unicode code point, producing valid UTF-8 output.
      name: 'fix-non-utf8-deps',
      enforce: 'pre',
      load(id) {
        if (id.includes('js-clipper')) {
          return readFileSync(id, 'latin1');
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  worker: {
    format: 'es'
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: './index.html',
        privacy: './privacy.html'
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
