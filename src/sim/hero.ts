import { ELEMENTS, ELEMENT_STAT_BONUS, HERO, HERO_WORLD_MARGIN, type Element } from '../config/balance';
import { defenseCameraTarget } from './camera';
import { countElementsInRing } from './formation';
import { dist, type GameState } from './state';

export interface HeroStats {
  dmg: number; maxHp: number; armor: number; critChance: number;
  dodge: number; hpRegenPerSec: number; skillDmgMul: number;
  counts: Record<Element, number>;
}

/** Thuộc tính nhân vật suy từ số trụ ĐANG SỐNG mỗi hệ (mọi vòng của bản đồ). Trụ chết → mất phần cộng. */
export function computeHeroStats(state: GameState): HeroStats {
  const counts: Record<Element, number> = { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
  for (let ring = 0; ring < state.layout.rings.length; ring++) {
    const c = countElementsInRing(state, ring);
    for (const e of ELEMENTS) counts[e] += c[e];
  }
  const s: HeroStats = {
    dmg: HERO.dmg, maxHp: HERO.hp + state.modifiers.heroMaxHpBonus, armor: HERO.baseArmor, critChance: HERO.baseCritChance,
    dodge: HERO.baseDodge, hpRegenPerSec: HERO.baseRegenPerSec, skillDmgMul: 1, counts,
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

/** E6: kẹp một điểm trong biên bản đồ của ván (tâm (0,0), cạnh map.worldSize). */
export function clampToWorld(state: GameState, x: number, y: number): { x: number; y: number } {
  const h = state.map.worldSize / 2 - HERO_WORLD_MARGIN;
  return { x: Math.min(h, Math.max(-h, x)), y: Math.min(h, Math.max(-h, y)) };
}

/** Di chuyển nhân vật về một điểm, kẹp ở biên bản đồ (E6: không còn bán kính hoạt động quanh tâm). */
function moveHeroToward(state: GameState, tx: number, ty: number, dt: number): void {
  const dx = tx - state.hero.x, dy = ty - state.hero.y;
  const len = Math.hypot(dx, dy) || 1;
  const step = Math.min(len, HERO.speed * dt);
  const p = clampToWorld(state, state.hero.x + (dx / len) * step, state.hero.y + (dy / len) * step);
  state.hero.x = p.x; state.hero.y = p.y;
}

function nearestEnemy(state: GameState): { target: (typeof state.enemies)[number] | null; best: number } {
  let target = null as null | (typeof state.enemies)[number];
  let best = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(state.hero.x, state.hero.y, e.x, e.y);
    if (d < best) { best = d; target = e; }
  }
  return { target, best };
}

/**
 * E6 — Di chuyển nhân vật (dùng cho cả 2 giai đoạn):
 * 1) Phím WASD/mũi tên (heroInput) — ưu tiên cao nhất, xóa đích click.
 * 2) Đích click-to-move (heroMoveTarget) — luôn bật ở thủ trận.
 * 3) Khi `chase` = true (giai đoạn chiến đấu): tự áp sát quái gần nhất ngoài tầm đánh.
 */
export function updateHeroMovement(state: GameState, dt: number, chase: boolean): void {
  const inp = state.heroInput;
  const len = Math.hypot(inp.x, inp.y);
  if (len > 0.01) {
    const p = clampToWorld(
      state,
      state.hero.x + (inp.x / len) * HERO.speed * dt,
      state.hero.y + (inp.y / len) * HERO.speed * dt,
    );
    state.hero.x = p.x; state.hero.y = p.y;
    state.heroMoveTarget = null;
    return;
  }
  if (state.heroMoveTarget) {
    const mt = state.heroMoveTarget;
    if (dist(state.hero.x, state.hero.y, mt.x, mt.y) < 0.15) { state.heroMoveTarget = null; return; }
    moveHeroToward(state, mt.x, mt.y, dt);
    return;
  }
  if (chase) {
    const { target, best } = nearestEnemy(state);
    if (target && best > HERO.range) moveHeroToward(state, target.x, target.y, dt);
  }
}

/** E6 — "Về tâm trận" (phím T / nút HUD): dịch chuyển nhân vật về tâm trận và kéo camera theo ngay. */
export function returnHeroToCenter(state: GameState): void {
  state.hero.x = 0.9; state.hero.y = 0;
  state.heroMoveTarget = null;
  const t = defenseCameraTarget(state);
  state.camera.x = t.x; state.camera.y = t.y;
}

/**
 * Nhân vật trong giai đoạn chiến đấu: hồi phục/mana/cooldown, di chuyển tự do
 * toàn bản đồ (updateHeroMovement), và tự tấn công quái gần nhất trong tầm —
 * kể cả khi đang di chuyển (E6).
 */
export function updateHero(state: GameState, dt: number): void {
  const stats = computeHeroStats(state);
  // hồi máu (Mộc) + mana
  state.hero.hp = Math.min(stats.maxHp, state.hero.hp + stats.hpRegenPerSec * dt);
  state.hero.mana = Math.min(HERO.manaMax, state.hero.mana + HERO.manaRegenPerSec * dt);
  for (const k of Object.keys(state.hero.cooldowns)) {
    state.hero.cooldowns[k] = Math.max(0, state.hero.cooldowns[k] - dt);
  }
  state.hero.atkCd -= dt;

  updateHeroMovement(state, dt, true);

  const { target, best } = nearestEnemy(state);
  if (!target || best > HERO.range) return;
  if (state.hero.atkCd > 0) return;
  state.hero.atkCd = 1 / HERO.atkPerSec;
  let dmg = stats.dmg;
  if (state.rand() < stats.critChance) dmg *= 2;
  target.hp -= dmg;
  state.sounds.push('attack:hero');
  state.projectiles.push({
    x1: state.hero.x, y1: state.hero.y, x2: target.x, y2: target.y,
    element: 'hero', ttl: 0.15, maxTtl: 0.15,
  });
  state.floaters.push({ x: target.x, y: target.y, text: `${Math.round(dmg)}`, ttl: 0.5, color: '#bfe3ff' });
}
