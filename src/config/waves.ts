import type { EnemyRole } from './enemies';

export type SpawnKind = EnemyRole | 'boss';

export interface WaveDef {
  wave: number;      // 1..8
  count: number;     // tổng số quái (kể cả boss)
  hpMul: number;     // đợt 1–5: 1 + 0.25*(n-1); đợt 6–8 tăng chậm hơn
  spawnInterval: number; // giây giữa hai lần spawn
  composition: Array<{ kind: SpawnKind; count: number }>;
}

// E1: 8 đợt, vai trò xuất hiện dần — đợt 2: Tốc, đợt 3: Giáp, đợt 4: Xa,
// đợt 6: Hồi, đợt 8: thêm Boss ở cuối.
export const TOTAL_WAVES = 8;
export const SPAWN_INTERVAL = 0.7;

const COMPOSITIONS: Record<number, Array<{ kind: SpawnKind; count: number }>> = {
  1: [{ kind: 'thuong', count: 8 }],
  2: [{ kind: 'thuong', count: 8 }, { kind: 'toc', count: 3 }],
  3: [{ kind: 'thuong', count: 10 }, { kind: 'giap', count: 4 }],
  4: [{ kind: 'thuong', count: 11 }, { kind: 'toc', count: 3 }, { kind: 'xa', count: 3 }],
  5: [{ kind: 'thuong', count: 12 }, { kind: 'giap', count: 4 }, { kind: 'xa', count: 4 }],
  6: [{ kind: 'thuong', count: 13 }, { kind: 'toc', count: 4 }, { kind: 'xa', count: 3 }, { kind: 'hoi', count: 3 }],
  7: [{ kind: 'thuong', count: 14 }, { kind: 'giap', count: 5 }, { kind: 'xa', count: 4 }, { kind: 'hoi', count: 3 }],
  8: [{ kind: 'thuong', count: 16 }, { kind: 'toc', count: 5 }, { kind: 'giap', count: 4 }, { kind: 'xa', count: 3 }, { kind: 'hoi', count: 1 }, { kind: 'boss', count: 1 }],
};

export const WAVES: WaveDef[] = Array.from({ length: TOTAL_WAVES }, (_, i) => {
  const n = i + 1;
  const composition = COMPOSITIONS[n];
  return {
    wave: n,
    count: composition.reduce((s, c) => s + c.count, 0),
    hpMul: n <= 5 ? 1 + 0.25 * (n - 1) : 2 + 0.15 * (n - 5), // E4: đợt 6–8 tăng chậm hơn (2.15/2.30/2.45)
    spawnInterval: SPAWN_INTERVAL,
    composition,
  };
});

export function waveDef(n: number): WaveDef {
  return WAVES[Math.min(Math.max(n, 1), TOTAL_WAVES) - 1];
}

// E3 — Chế độ Vô Tận: sau đợt 8, mỗi đợt +5 quái và HP ×1.12 lũy tiến (mũ nhẹ);
// boss xuất hiện ở các đợt chia hết cho 5.
export const ENDLESS_HP_GROWTH = 1.12;
export const ENDLESS_EXTRA_PER_WAVE = 5;

export function endlessWaveDef(n: number): WaveDef {
  const base = WAVES[TOTAL_WAVES - 1];
  const over = n - TOTAL_WAVES;
  const hasBoss = n % 5 === 0;
  const total = base.count - 1 + ENDLESS_EXTRA_PER_WAVE * over + (hasBoss ? 1 : 0); // base.count đã gồm 1 boss
  // scale thành phần (trừ boss) của đợt 8 lên tổng mới
  const nonBossBase = base.composition.filter((c) => c.kind !== 'boss');
  const nonBossTotal = nonBossBase.reduce((s, c) => s + c.count, 0);
  const target = total - (hasBoss ? 1 : 0);
  const composition: WaveDef['composition'] = nonBossBase.map((c) => ({
    kind: c.kind,
    count: Math.max(1, Math.round((c.count / nonBossTotal) * target)),
  }));
  // chỉnh tròn số để tổng khớp target
  let diff = target - composition.reduce((s, c) => s + c.count, 0);
  composition[0].count += diff;
  if (hasBoss) composition.push({ kind: 'boss', count: 1 });
  return {
    wave: n,
    count: total,
    hpMul: base.hpMul * Math.pow(ENDLESS_HP_GROWTH, over),
    spawnInterval: SPAWN_INTERVAL,
    composition,
  };
}

/** Định nghĩa đợt theo chế độ: thường (kẹp ở đợt cuối) hoặc Vô Tận (vượt đợt cuối). */
export function getWaveDef(n: number, endless: boolean): WaveDef {
  if (endless && n > TOTAL_WAVES) return endlessWaveDef(n);
  return waveDef(n);
}

/**
 * Kế hoạch spawn của một đợt: các loại thường được trộn đều (lấy từ nhóm
 * còn nhiều nhất trước), boss luôn ra cuối cùng.
 */
export function spawnPlan(def: WaveDef): SpawnKind[] {
  const buckets = def.composition
    .filter((c) => c.kind !== 'boss')
    .map((c) => ({ kind: c.kind, left: c.count }));
  const plan: SpawnKind[] = [];
  for (;;) {
    let best: { kind: SpawnKind; left: number } | null = null;
    for (const b of buckets) if (b.left > 0 && (!best || b.left > best.left)) best = b;
    if (!best) break;
    plan.push(best.kind);
    best.left--;
  }
  const bosses = def.composition.find((c) => c.kind === 'boss');
  if (bosses) for (let i = 0; i < bosses.count; i++) plan.push('boss');
  return plan;
}
