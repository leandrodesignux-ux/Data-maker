/// <reference lib="webworker" />
import { generateDataset } from "./generator";
import type { ScenarioId } from "./model";

self.onmessage = (event: MessageEvent<{ seed: number; enabled?: ScenarioId[] }>) => {
  try { self.postMessage({ ok: true, dataset: generateDataset(event.data.seed, event.data.enabled) }); }
  catch (error) { self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
};
