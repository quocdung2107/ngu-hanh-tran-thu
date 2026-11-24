import { LEVEL_DMG_MUL, LEVEL_EFFECT_MUL, LEVEL_HP_MUL, MAX_TOWER_LEVEL, TOWER_DEFS, upgradeCostFor } from '../config/towers';
import type { Element } from '../config/balance';
import { discountedCost, payBuildCost, payCost } from './resources';
import { checkRecipes, towerLinhMachMul, towerSynergyMul } from './formation';
import { dist, slotPos, tryRoot, tryStun, type GameState, type Tower } from './state';

/** Xây trụ: chỉ ở giai đoạn xây dựng, ô trống, đủ tài nguyên. Phá KHÔNG hoàn tài nguyên. */
export function buildTower(state: GameState, slot: number, element: Element): boolean {
  if (state.phase !== 'build') return false;
  if (slot < 0 || slot >= state.towers.length) return false;
  if (state.towers[slot]) return false;
  if (!payBuildCost(state, element)) return false;
  const def = TOWER_DEFS[element];
  const tower: Tower = {
    slot, ring: slotPos(state.layout, slot).ring, element, level: 1,
    hp: def.hp, maxHp: def.hp, atkCd: 0,
  };
  state.towers[slot] = tower;
  checkRecipes(state);
  return true;
}

/**
 * E1 — Nâng cấp trụ (chỉ ở giai đoạn xây dựng, tối đa MAX_TOWER_LEVEL cấp).
 * Cấp 2: ×1.6 dmg, +50% HP, giá 60% giá xây. Cấp 3: ×2.5 dmg, hiệu ứng phụ ×1.5, giá 120%.
 * HP tăng thêm được cộng vào HP hiện tại.
 */
export function upgradeTower(state: GameState, slot: number): boolean {
  if (state.phase !== 'build') return false;
  const tower = state.towers[slot];
  if (!tower || tower.level >= MAX_TOWER_LEVEL) return false;
  const toLevel = tower.level + 1;
  const base = upgradeCostFor(tower.element, toLevel);
  const cost = discountedCost(state, tower.element, base.linhThach, base.tinh);
  if (!payCost(state, tower.element, cost.linhThach, cost.tinh)) return false;
  const def = TOWER_DEFS[tower.element];
  const newMax = Math.round(def.hp * LEVEL_HP_MUL[toLevel]);
  tower.hp += newMax - tower.maxHp;
  tower.maxHp = newMax;
  tower.level = toLevel;
  return true;
}

/** Sát thương hiệu dụng của một trụ: gốc × cấp × tương sinh/khắc × Linh Mạch. */
export function towerEffectiveDmg(state: GameState, tower: Tower): number {
  const def = TOWER_DEFS[tower.element];
  return def.dmg * LEVEL_DMG_MUL[tower.level] * towerSynergyMul(state, tower.slot) * towerLinhMachMul(state, tower.slot);
}

/** Phá trụ do người chơi: chỉ ở giai đoạn xây dựng, hoàn trả 0 tài nguyên. */
export function destroyTowerByPlayer(state: GameState, slot: number): boolean {
  if (state.phase !== 'build') return false;
  if (!state.towers[slot]) return false;
  state.towers[slot] = null;
  return true;
}

/** Trụ bị quái phá trong chiến đấu. */
export function destroyTowerInCombat(state: GameState, slot: number): void {
  state.towers[slot] = null;
}

export function damageEnemy(state: GameState, enemyId: number, dmg: number): void {
  const e = state.enemies.find((x) => x.id === enemyId);
  if (e && e.alive) e.hp -= dmg;
}

/** Mỗi trụ tự tìm mục tiêu (quái tiến sâu nhất về trung tâm trong tầm) và tấn công độc lập. */
export function updateTowers(state: GameState, dt: number): void {
  for (const tower of state.towers) {
    if (!tower) continue;
    const def = TOWER_DEFS[tower.element];
    const pos = slotPos(state.layout, tower.slot);
    tower.atkCd -= dt;
    // chọn quái còn sống trong tầm, ưu tiên quái gần trung tâm nhất
    let target = null as null | (typeof state.enemies)[number];
    let best = Infinity;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (dist(pos.x, pos.y, e.x, e.y) > def.range) continue;
      const dCenter = dist(e.x, e.y, 0, 0);
      if (dCenter < best) { best = dCenter; target = e; }
    }
    if (!target || tower.atkCd > 0) continue;
    tower.atkCd = 1 / def.atkPerSec;

    let dmg = towerEffectiveDmg(state, tower);
    let crit = false;
    if (def.critChance && state.rand() < def.critChance) { dmg *= def.critMul ?? 2; crit = true; }
    target.hp -= dmg;
    state.sounds.push(`attack:${tower.element}`);
    state.projectiles.push({
      x1: pos.x, y1: pos.y, x2: target.x, y2: target.y,
      element: tower.element, ttl: 0.18, maxTtl: 0.18,
    });
    state.floaters.push({
      x: target.x, y: target.y, text: crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`,
      ttl: 0.55, color: crit ? '#ffd94a' : '#ffffff',
    });

    // hiệu ứng riêng theo hệ (cấp 3 mạnh hơn theo LEVEL_EFFECT_MUL; boss có thể miễn trói/choáng)
    const fxMul = LEVEL_EFFECT_MUL[tower.level];
    if (def.rootSec && state.time >= target.rootCdUntil) {
      tryRoot(state, target, def.rootSec * fxMul);
      target.rootCdUntil = state.time + (def.rootInternalCd ?? 3);
    }
    if (def.slowPct && def.slowSec) {
      target.slowPct = Math.max(target.slowPct, def.slowPct);
      target.slowUntil = state.time + def.slowSec * fxMul;
    }
    if (def.stunSec) tryStun(state, target, def.stunSec * fxMul);
    if (def.splashRadius && def.splashMul) {
      const radius = def.splashRadius * fxMul;
      for (const e of state.enemies) {
        if (!e.alive || e.id === target.id) continue;
        if (dist(target.x, target.y, e.x, e.y) <= radius) e.hp -= dmg * def.splashMul;
      }
      state.aoeFx.push({ x: target.x, y: target.y, radius, ttl: 0.3, maxTtl: 0.3, color: '#e05a3a' });
      for (let i = 0; i < 6; i++) {
        const a = state.rand() * Math.PI * 2; const sp = 0.8 + state.rand() * 1.4; const ttl = 0.3 + state.rand() * 0.25;
        state.particles.push({ x: target.x, y: target.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl, maxTtl: ttl, color: '#ff9a5a', size: 2 });
      }
    }
  }
}
