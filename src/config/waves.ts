export interface WaveDef {
  wave: number;      // 1..5
  count: number;     // 5 + 3n
  hpMul: number;     // 1 + 0.25*(n-1)
  spawnInterval: number; // giây giữa hai lần spawn
}

export const TOTAL_WAVES = 5;
export const SPAWN_INTERVAL = 0.7;

export const WAVES: WaveDef[] = Array.from({ length: TOTAL_WAVES }, (_, i) => {
  const n = i + 1;
  return { wave: n, count: 5 + 3 * n, hpMul: 1 + 0.25 * (n - 1), spawnInterval: SPAWN_INTERVAL };
});

export function waveDef(n: number): WaveDef {
  return WAVES[Math.min(Math.max(n, 1), TOTAL_WAVES) - 1];
}
