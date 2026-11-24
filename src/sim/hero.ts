import { ELEMENTS, ELEMENT_STAT_BONUS, HERO, type Element } from '../config/balance';
import { countElementsInRing } from './formation';
import { dist, type GameState } from './state';

export interface HeroStats {
  dmg: number; maxHp: number; armor: number; critChance: number;
  dodge: number; hpRegenPerSec: number; skillDmgMul: number;
  counts: Record<Element, number>;
}

/** Thuộc tính nhân vật suy từ số trụ ĐANG SỐNG mỗi hệ (cả 2 vòng). Trụ chết → mất phần cộng. */
export function computeHeroStats(state: GameState): HeroStats {
  const counts: Record<Element, number> = { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
  for (let ring = 0; ring < 2; ring++) {
    const c = countElementsInRing(state, ring);
    for (const e of ELEMENTS) counts[e] += c[e];
  }
  const s: HeroStats = {
    dmg: HERO.dmg, maxHp: HERO.hp, armor: HERO.baseArmor, critChance: HERO.baseCritChance,
    dodge: HERO.baseDodge, hpRegenPerSec: 0, skillDmgMul: 1, counts,
  };
  for (const e of ELEMENTS) {
    const b = ELEMENT_STAT_BONUS[e];
    const n = counts[e];
    s.dmg += b.dmg * n;
    s.critChance += b.critChance * n;
    s.hpRegenPerSec += b.hpRegenPerSec * n;
    s.maxHp += b.maxHp * n;
    s.armor += b.armor * n;
    s.dodge += b.dodge * n;
    s.skillDmgMul += b.skillDmgMulBonus * n;
  }
  return s;
}

/** Giảm sát thương lên nhân vật theo giáp: dmg * 50/(50+armor). */
export function mitigate(armor: number, dmg: number): number {
  return dmg * (50 / (50 + armor));
}

/** Sát thương trúng nhân vật: né tránh → lá chắn → giáp → HP. */
export function damageHero(state: GameState, rawDmg: number): void {
  const stats = computeHeroStats(state);
  if (state.rand() < stats.dodge) return; // né tránh
  let dmg = rawDmg;
  if (state.hero.shield > 0) {
    const absorbed = Math.min(state.hero.shield, dmg);
    state.hero.shield -= absorbed;
    dmg -= absorbed;
  }
  if (dmg > 0) state.hero.hp -= mitigate(stats.armor, dmg);
}

/** Nhân vật tự áp sát và tấn công quái gần nhất, không rời tâm quá homeRadius. */
export function updateHero(state: GameState, dt: number): void {
  const stats = computeHeroStats(state);
  // hồi máu (Mộc) + mana
  state.hero.hp = Math.min(stats.maxHp, state.hero.hp + stats.hpRegenPerSec * dt);
  state.hero.mana = Math.min(HERO.manaMax, state.hero.mana + HERO.manaRegenPerSec * dt);
  for (const k of Object.keys(state.hero.cooldowns)) {
    state.hero.cooldowns[k] = Math.max(0, state.hero.cooldowns[k] - dt);
  }
  state.hero.atkCd -= dt;

  let target = null as null | (typeof state.enemies)[number];
  let best = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(state.hero.x, state.hero.y, e.x, e.y);
    if (d < best) { best = d; target = e; }
  }
  if (!target) return;
  if (best > HERO.range) {
    // di chuyển về phía quái nhưng không rời tâm quá homeRadius
    const dx = target.x - state.hero.x, dy = target.y - state.hero.y;
    const len = Math.hypot(dx, dy) || 1;
    let nx = state.hero.x + (dx / len) * HERO.speed * dt;
    let ny = state.hero.y + (dy / len) * HERO.speed * dt;
    const dc = Math.hypot(nx, ny);
    if (dc > HERO.homeRadius) { nx *= HERO.homeRadius / dc; ny *= HERO.homeRadius / dc; }
    state.hero.x = nx; state.hero.y = ny;
    return;
  }
  if (state.hero.atkCd > 0) return;
  state.hero.atkCd = 1 / HERO.atkPerSec;
  let dmg = stats.dmg;
  if (state.rand() < stats.critChance) dmg *= 2;
  target.hp -= dmg;
  state.projectiles.push({
    x1: state.hero.x, y1: state.hero.y, x2: target.x, y2: target.y,
    element: 'hero', ttl: 0.15, maxTtl: 0.15,
  });
  state.floaters.push({ x: target.x, y: target.y, text: `${Math.round(dmg)}`, ttl: 0.5, color: '#bfe3ff' });
}
