/** Mulberry32. Never uses ambient randomness. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
export function hash32(value: string, seed = 0): number {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
export function stableChance(key: string, probability: number, seed = 0): boolean {
  return hash32(key, seed) / 4_294_967_296 < probability;
}
export function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)];
}
