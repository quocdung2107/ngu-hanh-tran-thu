import { SKILLS } from '../config/skills';
import { computeHeroStats } from './hero';
import { dist, type GameState } from './state';

/** Dùng kỹ năng nhân vật đã mở khóa: kiểm tra unlock + mana + cooldown. */
export function castSkill(state: GameState, skillId: string): boolean {
  const def = SKILLS[skillId];
  if (!def) return false;
  if (!state.unlockedSkills.includes(skillId)) return false;
  if ((state.hero.cooldowns[skillId] ?? 0) > 0) return false;
  if (state.hero.mana < def.manaCost) return false;

  let cx = state.hero.x, cy = state.hero.y;
  if (def.kind === 'damageArea') {
    if (def.center === 'center') { cx = 0; cy = 0; }
    if (def.center === 'nearestEnemy') {
      let best = Infinity; let t = null as null | (typeof state.enemies)[number];
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(state.hero.x, state.hero.y, e.x, e.y);
        if (d < best) { best = d; t = e; }
      }
      if (!t) return false; // không có mục tiêu thì không tốn mana
      cx = t.x; cy = t.y;
    }
  }

  state.hero.mana -= def.manaCost;
  state.hero.cooldowns[skillId] = def.cooldown;

  if (def.kind === 'heal') {
    const stats = computeHeroStats(state);
    state.hero.hp = Math.min(stats.maxHp, state.hero.hp + def.power);
    state.center.hp = Math.min(state.center.maxHp, state.center.hp + (def.centerHeal ?? 0));
    state.aoeFx.push({ x: state.hero.x, y: state.hero.y, radius: 1, ttl: 0.5, maxTtl: 0.5, color: '#58c472' });
  } else if (def.kind === 'shield') {
    state.hero.shield += def.power;
    state.aoeFx.push({ x: state.hero.x, y: state.hero.y, radius: 1, ttl: 0.5, maxTtl: 0.5, color: '#b08954' });
  } else {
    const stats = computeHeroStats(state);
    const dmg = def.power * stats.skillDmgMul; // Hỏa tăng sát thương kỹ năng
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (dist(cx, cy, e.x, e.y) > def.radius) continue;
      e.hp -= dmg;
      if (def.stunSec) e.stunUntil = Math.max(e.stunUntil, state.time + def.stunSec);
      if (def.rootSec) e.rootUntil = Math.max(e.rootUntil, state.time + def.rootSec);
      if (def.slowPct && def.slowSec) {
        e.slowPct = Math.max(e.slowPct, def.slowPct);
        e.slowUntil = state.time + def.slowSec;
      }
      state.floaters.push({ x: e.x, y: e.y, text: `-${Math.round(dmg)}`, ttl: 0.7, color: '#ffb37a' });
    }
    state.aoeFx.push({ x: cx, y: cy, radius: def.radius, ttl: 0.5, maxTtl: 0.5, color: '#ffb37a' });
    state.projectiles.push({ x1: state.hero.x, y1: state.hero.y, x2: cx, y2: cy, element: 'skill', ttl: 0.2, maxTtl: 0.2 });
  }
  return true;
}
