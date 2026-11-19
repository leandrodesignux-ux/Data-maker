import { DEFAULT_SEED, generateDataset } from "./generator";
import type { Dataset } from "./model";

const cached = new Map<number, Promise<Dataset>>();

/** One worker-backed generation per seed per browser session; all apps share the promise. */
export function getClientDataset(seed = DEFAULT_SEED): Promise<Dataset> {
  const existing = cached.get(seed);
  if (existing) return existing;
  const promise = typeof Worker === "undefined"
    ? Promise.resolve().then(() => generateDataset(seed))
    : new Promise<Dataset>((resolve, reject) => {
        const worker = new Worker(new URL("./generator.worker.ts", import.meta.url));
        worker.onmessage = (event: MessageEvent<{ ok: boolean; dataset?: Dataset; error?: string }>) => {
          worker.terminate();
          if (event.data.ok && event.data.dataset) resolve(event.data.dataset);
          else reject(new Error(event.data.error ?? "Dataset generation failed"));
        };
        worker.onerror = (event) => { worker.terminate(); reject(new Error(event.message)); };
        worker.postMessage({ seed });
      });
  cached.set(seed, promise);
  promise.catch(() => { if (cached.get(seed) === promise) cached.delete(seed); });
  return promise;
}
