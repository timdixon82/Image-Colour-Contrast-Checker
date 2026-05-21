// Preloads OCR model and runtime files into the browser HTTP cache before
// the user can interact with the app. Files are detected based on WebGPU
// availability so only the relevant WASM variant is downloaded (~30 MB total).

// iOS/iPadOS expose navigator.gpu but ORT's WebGPU backend does not work
// there, so those devices use the WASM runtime. Keep in sync with
// adapters/paddle-ocr.js.
function isAppleMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iP(hone|ad|od)/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function getFiles() {
  const useWebGpu = typeof navigator !== 'undefined' && !!navigator.gpu && !isAppleMobile();
  return [
    { label: 'Text detection model',  path: 'models/ch_PP-OCRv4_det_infer.onnx',                               approxBytes: 4_700_000  },
    { label: 'Text recognition model',path: 'models/ch_PP-OCRv4_rec_infer.onnx',                               approxBytes: 10_500_000 },
    {
      label: useWebGpu ? 'OCR runtime (WebGPU)' : 'OCR runtime',
      path:  useWebGpu ? 'ort/ort-wasm-simd-threaded.jsep.wasm' : 'ort/ort-wasm-simd-threaded.wasm',
      approxBytes: useWebGpu ? 26_000_000 : 12_600_000
    },
    {
      label: 'OCR runtime module',
      path:  useWebGpu ? 'ort/ort-wasm-simd-threaded.jsep.mjs' : 'ort/ort-wasm-simd-threaded.mjs',
      approxBytes: useWebGpu ? 46_000 : 24_000
    },
    { label: 'Character dictionary',  path: 'models/ppocr_keys_v1.txt',                                        approxBytes: 26_000     },
  ];
}

// onProgress is called with: { pct (0–100), label, fileIndex, fileCount, done }
export async function preloadModels(onProgress) {
  const files = getFiles();
  const totalApprox = files.reduce((s, f) => s + f.approxBytes, 0);
  let bytesLoaded = 0;

  onProgress({ pct: 0, label: '', fileIndex: 0, fileCount: files.length, done: false });

  for (let i = 0; i < files.length; i++) {
    const { label, path, approxBytes } = files[i];
    const url = new URL(path, document.baseURI).href;

    onProgress({ pct: (bytesLoaded / totalApprox) * 100, label, fileIndex: i, fileCount: files.length, done: false });

    try {
      const response = await fetch(url);

      if (!response.ok || !response.body) {
        bytesLoaded += approxBytes;
        continue;
      }

      const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10) || approxBytes;
      const reader = response.body.getReader();
      let fileBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fileBytes += value.length;
        onProgress({
          pct: Math.min(((bytesLoaded + fileBytes) / totalApprox) * 100, 99),
          label,
          fileIndex: i,
          fileCount: files.length,
          done: false
        });
      }

      bytesLoaded += fileBytes || contentLength;
    } catch (_) {
      bytesLoaded += approxBytes;
    }
  }

  onProgress({ pct: 100, label: '', fileIndex: files.length, fileCount: files.length, done: true });
}
