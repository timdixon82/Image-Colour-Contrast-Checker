/*!
 * Service worker for Image Colour Contrast Checker.
 *
 * Two jobs:
 *  1. Cross-origin isolation — injects COOP/COEP response headers so the page
 *     is crossOriginIsolated (required for SharedArrayBuffer / multi-threaded
 *     WebAssembly). This half is coi-serviceworker v0.1.7 by Guido Zuidhof and
 *     contributors (MIT licence), kept behaviourally identical.
 *  2. Persistent caching of the OCR model and ONNX runtime files. iOS Safari
 *     evicts large resources from its HTTP cache between visits, so without
 *     this the ~30 MB of models re-downloads on every page load. Cache Storage
 *     is far more durable, so the files are fetched once and reused.
 */

let coepCredentialless = false;

// Cache for the model + runtime files. Bump the version suffix whenever the
// ONNX runtime or model files change, so stale bytes are not served.
const MODEL_CACHE = 'icc-model-cache-v1';
const CACHEABLE_PATH = /\/(?:models|ort)\//;

if (typeof window === 'undefined') {
  // ─── Service worker context ──────────────────────────────────────────────

  self.addEventListener('install', () => self.skipWaiting());

  self.addEventListener('activate', (event) => event.waitUntil((async () => {
    // Remove superseded model caches.
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('icc-model-cache-') && k !== MODEL_CACHE)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })()));

  self.addEventListener('message', (ev) => {
    if (!ev.data) {
      return;
    } else if (ev.data.type === 'deregister') {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => clients.forEach((client) => client.navigate(client.url)));
    } else if (ev.data.type === 'coepCredentialless') {
      coepCredentialless = ev.data.value;
    }
  });

  // Re-emit a response with the cross-origin isolation headers.
  const withCoiHeaders = (response) => {
    const headers = new Headers(response.headers);
    headers.set('Cross-Origin-Embedder-Policy',
      coepCredentialless ? 'credentialless' : 'require-corp');
    if (!coepCredentialless) {
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  // Cache-first for the large, effectively-immutable model + runtime files.
  // The pristine network response is stored; isolation headers are applied
  // fresh on every serve, never cached.
  const cacheFirst = async (request) => {
    const cache = await caches.open(MODEL_CACHE);
    const cached = await cache.match(request);
    if (cached) return withCoiHeaders(cached);

    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return withCoiHeaders(response);
  };

  self.addEventListener('fetch', (event) => {
    const r = event.request;
    if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') {
      return;
    }

    const url = new URL(r.url);
    if (r.method === 'GET'
        && url.origin === self.location.origin
        && CACHEABLE_PATH.test(url.pathname)) {
      event.respondWith(cacheFirst(r).catch(() => fetch(r)));
      return;
    }

    // Default: coi-serviceworker's COOP/COEP injection.
    const request = (coepCredentialless && r.mode === 'no-cors')
      ? new Request(r, { credentials: 'omit' })
      : r;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }
          return withCoiHeaders(response);
        })
        .catch((e) => console.error(e))
    );
  });

} else {
  // ─── Page context: register the worker ───────────────────────────────────
  // (coi-serviceworker v0.1.7 registration logic, unchanged.)
  (() => {
    const coi = {
      shouldRegister: () => true,
      shouldDeregister: () => false,
      coepCredentialless: () => !(window.chrome || window.netscape),
      doReload: () => window.location.reload(),
      quiet: false,
      ...window.coi
    };

    const n = navigator;

    if (n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({
        type: 'coepCredentialless',
        value: coi.coepCredentialless(),
      });

      if (coi.shouldDeregister()) {
        n.serviceWorker.controller.postMessage({ type: 'deregister' });
      }
    }

    // If we're already isolated: do nothing. Also bail if the browser has no
    // notion of crossOriginIsolated.
    if (window.crossOriginIsolated !== false || !coi.shouldRegister()) return;

    if (!window.isSecureContext) {
      !coi.quiet && console.log('COOP/COEP Service Worker not registered, a secure context is required.');
      return;
    }

    if (n.serviceWorker) {
      n.serviceWorker.register(window.document.currentScript.src).then(
        (registration) => {
          !coi.quiet && console.log('COOP/COEP Service Worker registered', registration.scope);

          registration.addEventListener('updatefound', () => {
            !coi.quiet && console.log('Reloading page to make use of updated COOP/COEP Service Worker.');
            coi.doReload();
          });

          if (registration.active && !n.serviceWorker.controller) {
            !coi.quiet && console.log('Reloading page to make use of COOP/COEP Service Worker.');
            coi.doReload();
          }
        },
        (err) => {
          !coi.quiet && console.error('COOP/COEP Service Worker failed to register:', err);
        }
      );
    }
  })();
}
