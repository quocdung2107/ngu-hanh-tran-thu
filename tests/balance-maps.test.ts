import { expect, it } from 'vitest';
import { MAPS, mapById } from '../src/config/maps';
import type { Element } from '../src/config/balance';
import { createGame, slotIndex, type GameState } from '../src/sim/state';
import { buildTower, upgradeTower } from '../src/sim/towers';
import { startWave } from '../src/sim/waves';
import { tick } from '../src/sim/combat';
import { castSkill } from '../src/sim/skills';

// PRNG có hạt giống để kết quả cân bằng ổn định giữa các lần chạy.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SINH_CYCLE: Element[] = ['kim', 'thuy', 'moc', 'hoa', 'tho'];

/** Người chơi mẫu: tài nguyên thật; lấp đầy + nâng cấp 2 vòng trong lên cấp 2 trước khi mở rộng ra vòng ngoài, sau đó nâng dần lên cấp 3. */
function autoBuild(s: GameState): void {
  const ringMinLevel = (ring: number): number => {
    let min = Infinity;
    const n = s.layout.rings[ring].slots;
    for (let i = 0; i < n; i++) {
      const t = s.towers[slotIndex(s.layout, ring, i)];
      if (t) min = Math.min(min, t.level);
    }
    return min === Infinity ? 0 : min;
  };
  const ringFull = (ring: number): boolean => {
    const n = s.layout.rings[ring].slots;
    for (let i = 0; i < n; i++) if (!s.towers[slotIndex(s.layout, ring, i)]) return false;
    return true;
  };
  const tryBuildInRing = (ring: number): boolean => {
    const n = s.layout.rings[ring].slots;
    for (let i = 0; i < n; i++) {
      const slot = slotIndex(s.layout, ring, i);
      if (s.towers[slot]) continue;
      const preferred = SINH_CYCLE[i % SINH_CYCLE.length];
      if (buildTower(s, slot, preferred)) return true;
      const byTinh = [...SINH_CYCLE].sort((a, b) => s.resources.tinh[b] - s.resources.tinh[a]);
      for (const el of byTinh) if (buildTower(s, slot, el)) return true;
      return false; // ô này không đủ tiền với mọi hệ
    }
    return false;
  };
  const tryUpgradeLowest = (): boolean => {
    let candidate = -1; let candLevel = Infinity;
    for (let slot = 0; slot < s.towers.length; slot++) {
      const t = s.towers[slot];
      if (t && t.level < 3 && t.level < candLevel) { candLevel = t.level; candidate = slot; }
    }
    return candidate >= 0 && upgradeTower(s, candidate);
  };

  for (let guard = 0; guard < 300; guard++) {
    // vòng đích: vòng đầu tiên chưa đầy, với điều kiện mọi vòng trong hơn đã đầy và cấp tối thiểu ≥2 (2 vòng trong được miễn điều kiện cấp)
    let targetRing = -1;
    for (let ring = 0; ring < s.layout.rings.length; ring++) {
      if (ringFull(ring)) continue;
      let ok = true;
      for (let inner = 0; inner < ring; inner++) {
        if (!ringFull(inner) || (inner >= 2 && ringMinLevel(inner) < 2)) ok = false;
      }
      // vòng 3+ chỉ mở khi 2 vòng trong đã cấp ≥2
      if (ring >= 2 && (ringMinLevel(0) < 2 || ringMinLevel(1) < 2)) ok = false;
      if (ok) { targetRing = ring; break; }
    }
    if (targetRing >= 0 && tryBuildInRing(targetRing)) continue;
    if (tryUpgradeLowest()) continue;
    if (targetRing >= 0) break;
    // mọi vòng đã đầy và không nâng được nữa
    if (s.layout.rings.every((_, r) => ringFull(r))) break;
    // kẹt điều kiện mở vòng (thiếu tiền nâng) — thử xây thẳng vòng đích bất kỳ còn trống
    let built = false;
    for (let ring = 0; ring < s.layout.rings.length && !built; ring++) if (!ringFull(ring)) built = tryBuildInRing(ring);
    if (!built) break;
  }
}

import { SKILLS } from '../src/config/skills';

/**
 * E6 — Người chơi mẫu BIẾT ĐI LẠI trên bản đồ lớn: trong chiến đấu, liên tục ra
 * lệnh di chuyển tới điểm chặn nằm giữa tâm trận và quái gần tâm nhất (tối đa
 * 9 đơn vị khỏi tâm), hết quái thì quay về tâm. Không còn đứng yên chờ quái —
 * và cũng không đuổi theo quái ra tận cổng như hành vi tự đuổi mặc định.
 */
function roam(s: GameState): void {
  let bx = 0, by = 0, bd = Infinity;
  for (const e of s.enemies) {
    const d = Math.hypot(e.x, e.y);
    if (d < bd) { bd = d; bx = e.x; by = e.y; }
  }
  if (bd === Infinity) { s.heroMoveTarget = { x: 0.9, y: 0 }; return; }
  const r = Math.min(9, bd * 0.55);
  const k = bd > 0 ? r / bd : 0;
  s.heroMoveTarget = { x: bx * k, y: by * k };
}

/** Ưu tiên hồi máu khi nhân vật hoặc trung tâm thấp máu, còn lại dùng chiêu sát thương đầu tiên sẵn sàng. */
function smartCast(s: GameState): void {
  const heal = s.unlockedSkills.find((id) => SKILLS[id].kind === 'heal');
  if (heal && (s.hero.hp < 130 || s.center.hp < 150)) { castSkill(s, heal); return; }
  const dmg = s.unlockedSkills.find((id) => SKILLS[id].kind === 'damageArea');
  if (dmg) castSkill(s, dmg);
}

function playMap(mapId: string, seed: number) {
  const s = createGame(mulberry32(seed), mapById(mapId));
  let guard = 0;
  while (s.phase !== 'won' && s.phase !== 'lost' && guard++ < 40) {
    if (s.phase === 'build') { autoBuild(s); startWave(s); }
    for (let i = 0; i < 20 * 120 && s.phase === 'combat'; i++) {
      roam(s);
      tick(s, 1 / 20);
      smartCast(s);
    }
  }
  return s;
}

// Cân bằng E4: người chơi mẫu với tài nguyên thật phải thắng được cả 3 bản đồ,
// nhưng bản đồ khó không được thắng "trắng" (trung tâm nguyên vẹn + nhân vật đầy máu).
for (const map of MAPS) {
  it(`cân bằng: người chơi mẫu thắng ${map.id} bằng tài nguyên thật`, () => {
    const s = playMap(map.id, 1234);
    console.log(`[${map.id}] kết quả: ${s.phase} | đợt: ${s.wave} | kills: ${s.stats.kills} | HP tâm: ${Math.round(s.center.hp)}/${s.center.maxHp} (+khiên còn ${Math.round(s.center.shieldHp)}) | HP hero: ${Math.round(s.hero.hp)}`);
    expect(s.phase).toBe('won');
    if (map.id !== 'map1') {
      expect(s.center.hp < s.center.maxHp || s.center.shieldHp < s.center.maxShieldHp || s.hero.hp < 200).toBe(true);
    }
  }, 120000);
}
