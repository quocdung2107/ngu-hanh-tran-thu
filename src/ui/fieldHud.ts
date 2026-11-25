// E5 — HUD chế độ Dã Chiến: HP/mana nhân vật, đồng hồ sống sót, số diệt,
// tài nguyên đã nhặt, nút kỹ năng 1/2/3 (kèm cooldown), màn hình kết quả.
import { ELEMENTS, ELEMENT_COLORS, ELEMENT_NAMES } from '../config/balance';
import { FIELD, FIELD_SKILLS } from '../config/field';
import type { FieldState } from '../sim/field';

export interface FieldHudCallbacks {
  onCastSkill: (skillId: string) => void;
  onRestart: () => void;
}

const $ = (id: string) => document.getElementById(id)!;
const fmt = (n: number) => Math.floor(n).toString();

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function bar(ratio: number, color: string): string {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return `<div style="background:#0b111c;border:1px solid #2b4258;border-radius:4px;height:12px;overflow:hidden">
    <div style="width:${pct}%;height:100%;background:${color}"></div></div>`;
}

export class FieldHud {
  private cb: FieldHudCallbacks;
  private lastSig = '';

  constructor(cb: FieldHudCallbacks) {
    this.cb = cb;
    document.addEventListener('click', (ev) => {
      const el = ev.target as HTMLElement;
      const cast = el.closest('[data-field-cast]') as HTMLElement | null;
      if (cast) { this.cb.onCastSkill(cast.dataset.fieldCast!); return; }
      if (el.closest('[data-field-restart]')) this.cb.onRestart();
    });
  }

  update(state: FieldState): void {
    // thanh tài nguyên trên cùng: hiển thị kho đã nhặt trong ván dã chiến
    $('resources').innerHTML =
      `<span class="res">💎 Linh Thạch đã nhặt: <b>${fmt(state.stats.linhThach)}</b></span>` +
      ELEMENTS.map((e) => `<span class="res" style="color:${ELEMENT_COLORS[e]}">● ${ELEMENT_NAMES[e]} tinh: <b>${fmt(state.stats.tinh[e])}</b></span>`).join('');

    const bossAlive = state.enemies.some((e) => e.kind === 'boss');
    const sig = [
      state.phase, Math.floor(state.elapsed * 2), state.stats.kills, state.enemies.length,
      Math.floor(state.hero.hp), Math.floor(state.hero.mana),
      FIELD_SKILLS.map((s) => Math.ceil(state.hero.cooldowns[s.id] ?? 0)).join(','),
      bossAlive ? 1 : 0,
    ].join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;

    const h = state.hero;
    $('field-info').innerHTML = `
      <h3>🏹 Dã Chiến — Sống sót ${clock(FIELD.survivalTime)}</h3>
      <div>⏱ Thời gian sống: <b>${clock(state.elapsed)}</b> / ${clock(FIELD.survivalTime)}</div>
      <div>HP nhân vật: <b>${Math.max(0, Math.ceil(h.hp))}/${h.maxHp}</b></div>
      ${bar(h.hp / h.maxHp, '#58c472')}
      <div style="margin-top:4px">Mana: <b>${fmt(h.mana)}/${FIELD.hero.manaMax}</b></div>
      ${bar(h.mana / FIELD.hero.manaMax, '#4aa8e0')}
      <div style="margin-top:4px">⚔ Đã diệt: <b>${state.stats.kills}</b> · Quái đang vây: <b>${state.enemies.length}</b></div>
      <div>💎 Đã nhặt: <b>${fmt(state.stats.linhThach)}</b> Linh Thạch · Tinh: ${ELEMENTS.map((e) => `<span style="color:${ELEMENT_COLORS[e]}">${ELEMENT_NAMES[e]} ${fmt(state.stats.tinh[e])}</span>`).join(' · ')}</div>
      ${bossAlive ? '<div class="warn">👑 BOSS DÃ CHIẾN đang ở trên bản đồ!</div>' : state.bossSpawned ? '<div>👑 Đã hạ boss dã chiến.</div>' : `<div class="dim">Boss dã chiến xuất hiện ở ${clock(FIELD.boss.atSec)}.</div>`}
      <div class="dim">Di chuyển: WASD / phím mũi tên / click chuột. Kỹ năng: phím 1/2/3 hoặc nút bên dưới. Vật phẩm rơi ra sẽ tự hút về khi bạn tới gần.</div>
    `;

    $('field-skills').innerHTML = `<h3>Kỹ năng dã chiến</h3>` + FIELD_SKILLS.map((sk) => {
      const cd = state.hero.cooldowns[sk.id] ?? 0;
      const dis = state.phase !== 'running' || cd > 0 || state.hero.mana < sk.manaCost;
      return `<button data-field-cast="${sk.id}" ${dis ? 'disabled' : ''} title="${sk.desc}">
        [${sk.key}] ✨ ${sk.name} — ${sk.manaCost} mana${cd > 0 ? ` (CD ${cd.toFixed(0)}s)` : ''}
        <small>${sk.desc}</small></button>`;
    }).join('');

    const ov = $('overlay');
    if (state.phase !== 'won' && state.phase !== 'lost') { ov.classList.add('hidden'); ov.innerHTML = ''; return; }
    ov.classList.remove('hidden');
    const tinh = ELEMENTS.map((e) => `${ELEMENT_NAMES[e]}: ${state.stats.tinh[e]}`).join(' · ');
    ov.innerHTML = `
      <div class="overlay-card">
        <h2>${state.phase === 'won' ? '🏆 SỐNG SÓT THÀNH CÔNG!' : '💀 TỬ TRẬN NƠI DÃ NGOẠI'}</h2>
        <p>Thời gian sống sót: <b>${clock(state.elapsed)}</b></p>
        <p>Quái đã diệt: <b>${state.stats.kills}</b></p>
        <p>Linh Thạch đã nhặt: <b>${fmt(state.stats.linhThach)}</b></p>
        <p>Tinh đã nhặt — ${tinh}</p>
        <button class="primary" data-field-restart>↻ Chơi lại Dã Chiến</button>
      </div>`;
  }
}
