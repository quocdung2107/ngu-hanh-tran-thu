import {
  AOE_MIN_TOWERS, ELEMENTS, ELEMENT_COLORS, ELEMENT_NAMES, type Element,
} from '../config/balance';
import { RECIPES, RING_ULTS } from '../config/recipes';
import { SKILLS } from '../config/skills';
import { MAX_TOWER_LEVEL, TOWER_DEFS, upgradeCostFor } from '../config/towers';
import { getWaveDef } from '../config/waves';
import { aoePowerScale, countElementsInRing, livingTowersInRing, towerSynergyMul } from '../sim/formation';
import { computeHeroStats } from '../sim/hero';
import { towerEffectiveDmg } from '../sim/towers';
import { discountedCost, effectiveBuildCost } from '../sim/resources';
import { slotPos, type GameState } from '../sim/state';

export interface HudCallbacks {
  onBuild: (slot: number, element: Element) => void;
  onDestroy: (slot: number) => void;
  onUpgrade: (slot: number) => void;
  onStartWave: () => void;
  onCastSkill: (skillId: string) => void;
  onRestart: () => void;
  onExportPreset: () => string;
  onImportPreset: (code: string) => string;
}

const $ = (id: string) => document.getElementById(id)!;
const fmt = (n: number) => Math.floor(n).toString();

export class Hud {
  selectedSlot = -1;
  private cb: HudCallbacks;
  private lastSig = '';

  constructor(cb: HudCallbacks) {
    this.cb = cb;
    document.addEventListener('click', (ev) => {
      const el = ev.target as HTMLElement;
      const build = el.closest('[data-build]') as HTMLElement | null;
      if (build) { this.cb.onBuild(Number(build.dataset.slot), build.dataset.build as Element); return; }
      if (el.closest('[data-destroy]')) { this.cb.onDestroy(Number((el.closest('[data-destroy]') as HTMLElement).dataset.slot)); return; }
      if (el.closest('[data-upgrade]')) { this.cb.onUpgrade(Number((el.closest('[data-upgrade]') as HTMLElement).dataset.slot)); return; }
      if (el.closest('[data-start-wave]')) { this.cb.onStartWave(); return; }
      const cast = el.closest('[data-cast]') as HTMLElement | null;
      if (cast) { this.cb.onCastSkill(cast.dataset.cast!); return; }
      if (el.closest('[data-restart]')) { this.cb.onRestart(); return; }
      if (el.closest('[data-export-preset]')) {
        const ta = document.getElementById('preset-code') as HTMLTextAreaElement | null;
        if (ta) { ta.value = this.cb.onExportPreset(); this.setPresetStatus('Đã xuất mã trận hình của bản đồ này (đã lưu làm mẫu).'); }
        return;
      }
      if (el.closest('[data-import-preset]')) {
        const ta = document.getElementById('preset-code') as HTMLTextAreaElement | null;
        if (ta) this.setPresetStatus(this.cb.onImportPreset(ta.value));
      }
    });
    this.renderPresetPanel();
  }

  private setPresetStatus(msg: string): void {
    const el = document.getElementById('preset-status');
    if (el) el.textContent = msg;
  }

  private renderPresetPanel(): void {
    const el = document.getElementById('preset-info');
    if (!el) return;
    el.innerHTML = `
      <h3>Trận hình mẫu (mã văn bản)</h3>
      <textarea id="preset-code" rows="3" placeholder="Dán mã trận hình vào đây để nhập, hoặc bấm Xuất mã để lấy mã trận hiện tại"></textarea>
      <button data-export-preset>⬆ Xuất mã + lưu mẫu cho bản đồ này</button>
      <button data-import-preset>⬇ Nhập mã (dựng lại trận, chỉ ở giai đoạn xây dựng)</button>
      <div class="dim" id="preset-status"></div>`;
  }

  update(state: GameState): void {
    // thanh tài nguyên (cập nhật mỗi frame, rẻ)
    $('resources').innerHTML =
      `<span class="res">💎 Linh Thạch: <b>${fmt(state.resources.linhThach)}</b></span>` +
      ELEMENTS.map((e) => `<span class="res" style="color:${ELEMENT_COLORS[e]}">● ${ELEMENT_NAMES[e]} tinh: <b>${fmt(state.resources.tinh[e])}</b></span>`).join('');

    // các panel còn lại chỉ vẽ lại khi có thay đổi đáng kể (tránh giật nút bấm)
    const sig = [
      state.phase, state.wave, this.selectedSlot, state.enemies.length, state.toSpawn,
      Math.floor(state.time * 2), state.unlockedSkills.join(','),
      state.towers.map((t) => (t ? t.element[0] + t.level : '.')).join(''),
      state.linhMach.join(','),
      Math.floor(state.hero.hp), Math.floor(state.center.hp), Math.floor(state.hero.mana),
      Math.floor((state.rings[0].cooldown + state.rings[1].cooldown) * 2),
    ].join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.renderCombatInfo(state);
    this.renderSlotInfo(state);
    this.renderFormation(state);
    this.renderSkills(state);
    this.renderOverlay(state);
  }

  private renderCombatInfo(state: GameState): void {
    const stats = computeHeroStats(state);
    const remaining = state.toSpawn + state.enemies.length;
    const phaseName = { build: '🛠 Xây dựng', combat: '⚔️ Chiến đấu', won: '🏆 Thắng', lost: '💀 Thua' }[state.phase];
    $('combat-info').innerHTML = `
      <h3>Thông tin chiến đấu</h3>
      <div>Giai đoạn: <b>${phaseName}</b></div>
      <div>${state.map.name}</div>
      <div>Đợt: <b>${state.endless ? `Vô tận ${state.wave}` : `${state.wave}/${state.map.waves}`}</b> — quái hệ <b style="color:${ELEMENT_COLORS[state.waveElement]}">${ELEMENT_NAMES[state.waveElement]}</b> (${getWaveDef(state.wave, state.endless).count} con)${state.endless && state.endlessRecord > 0 ? ` · Kỷ lục: đợt ${state.endlessRecord}` : ''}</div>
      <div>Quái còn lại: <b>${state.phase === 'combat' ? remaining : '—'}</b></div>
      <div>HP nhân vật: <b>${Math.max(0, Math.ceil(state.hero.hp))}/${stats.maxHp}</b> · Mana: <b>${fmt(state.hero.mana)}/100</b>${state.hero.shield > 0 ? ` · 🛡 Lá chắn: <b>${fmt(state.hero.shield)}</b>` : ''}</div>
      <div>HP trung tâm: <b>${Math.max(0, Math.ceil(state.center.hp))}/${state.center.maxHp}</b></div>
      ${state.center.maxShieldHp > 0 ? `<div>Khiên trung tâm: <b>${Math.max(0, Math.ceil(state.center.shieldHp))}/${state.center.maxShieldHp}</b> <span class="dim">(lớp ngoài, hứng đòn trước)</span></div>` : ''}
      <div>Ô Linh Mạch đợt này: <b>${state.linhMach.map((i) => `Ô ${i + 1}`).join(', ') || '—'}</b> <span class="dim">(trụ trên ô +25% sát thương)</span></div>
      ${state.message ? `<div class="msg">${state.message}</div>` : ''}
      ${state.phase === 'build' ? `<button class="primary" data-start-wave>▶ Bắt đầu đợt ${state.wave} (quái hệ ${ELEMENT_NAMES[state.waveElement]})</button>` : ''}
    `;
  }

  private renderSlotInfo(state: GameState): void {
    const el = $('slot-info');
    if (this.selectedSlot < 0) {
      el.innerHTML = `<h3>Thông tin trụ</h3><div class="dim">Bấm vào một ô trụ trên trận pháp để xem / xây trụ.</div>`;
      return;
    }
    const slot = this.selectedSlot;
    const pos = slotPos(state.layout, slot);
    const tower = state.towers[slot];
    const isMach = state.linhMach.includes(slot);
    const title = `Ô trụ ${slot + 1} — Vòng ${pos.ring + 1}${isMach ? ' · <span style="color:#40e0d0">✦ Linh Mạch (+25% dmg đợt này)</span>' : ''}`;
    if (tower) {
      const d = TOWER_DEFS[tower.element];
      const eff = towerEffectiveDmg(state, tower);
      const syn = towerSynergyMul(state, slot);
      const upBase = tower.level < MAX_TOWER_LEVEL ? upgradeCostFor(tower.element, tower.level + 1) : null;
      const upCost = upBase ? discountedCost(state, tower.element, upBase.linhThach, upBase.tinh) : null;
      const affordUp = upCost ? state.resources.linhThach >= upCost.linhThach && state.resources.tinh[tower.element] >= upCost.tinh : false;
      el.innerHTML = `
        <h3>${title}</h3>
        <div><b style="color:${ELEMENT_COLORS[tower.element]}">${d.name}</b> · Cấp <b>${tower.level}/${MAX_TOWER_LEVEL}</b> · HP: ${Math.ceil(tower.hp)}/${tower.maxHp}</div>
        <div>Sát thương hiệu dụng: <b>${eff.toFixed(1)}</b> (gốc ${d.dmg}) · Tầm: ${d.range} · Tốc độ đánh: ${d.atkPerSec}/s</div>
        <div class="dim">Tương sinh/khắc với trụ kề: ×${syn.toFixed(2)}${isMach ? ' · Linh Mạch: ×1.25' : ''}</div>
        <div class="dim">${d.desc}</div>
        ${state.phase === 'build' ? `
          ${upCost ? `<button data-upgrade data-slot="${slot}" ${affordUp ? '' : 'disabled'}>⬆ Nâng lên cấp ${tower.level + 1} — ${upCost.linhThach} LT + ${upCost.tinh} ${ELEMENT_NAMES[tower.element]} tinh</button>` : '<div class="dim">Đã đạt cấp tối đa.</div>'}
          <button class="danger" data-destroy data-slot="${slot}">🗑 Phá hủy trụ (không hoàn tài nguyên)</button>` : '<div class="dim">Đang chiến đấu — không phá/nâng được trụ.</div>'}
      `;
      return;
    }
    const buttons = ELEMENTS.map((e) => {
      const d = TOWER_DEFS[e];
      const c = effectiveBuildCost(state, e);
      const afford = state.resources.linhThach >= c.linhThach && state.resources.tinh[e] >= c.tinh;
      return `<button data-build="${e}" data-slot="${slot}" ${state.phase !== 'build' || !afford ? 'disabled' : ''} title="${d.desc}">
        <span style="color:${ELEMENT_COLORS[e]}">●</span> ${d.name} — ${c.linhThach} LT + ${c.tinh} ${ELEMENT_NAMES[e]} tinh
        <small>${d.dmg} dmg · tầm ${d.range} · ${d.atkPerSec}/s · HP ${d.hp}</small></button>`;
    }).join('');
    el.innerHTML = `<h3>${title} (trống)</h3>${state.phase === 'build' ? buttons : '<div class="dim">Đang chiến đấu — không xây được trụ.</div>'}`;
  }

  private renderFormation(state: GameState): void {
    const parts: string[] = ['<h3>Trận pháp & công thức</h3>'];
    for (let ring = 0; ring < state.layout.rings.length; ring++) {
      const living = livingTowersInRing(state, ring);
      const ult = RING_ULTS[ring];
      const cd = state.rings[ring].cooldown;
      const ultState = living < AOE_MIN_TOWERS
        ? `<span class="warn">Chưa đủ trụ (cần ≥${AOE_MIN_TOWERS})</span>`
        : cd > 0 ? `Hồi chiêu: ${cd.toFixed(1)}s` : `✅ Sẵn sàng (hệ số ×${aoePowerScale(living)})`;
      parts.push(`<div class="ring-head">Vòng ${ring + 1}: ${living}/${state.layout.rings[ring].slots} trụ sống · Tuyệt kỹ <b>${ult.name}</b> (${ult.dmg} dmg, CD ${ult.cooldown}s): ${ultState}</div>`);
      for (const r of RECIPES.filter((x) => x.ring === ring)) {
        const counts = countElementsInRing(state, ring);
        const prog = Object.entries(r.requires).map(([e, n]) => `${ELEMENT_NAMES[e as Element]} ${counts[e as Element]}/${n}`).join(' · ');
        const unlocked = state.unlockedSkills.includes(r.skillId);
        parts.push(`<div class="recipe ${unlocked ? 'unlocked' : ''}">${unlocked ? '🔓' : '🔒'} <b>${r.name}</b> → ${SKILLS[r.skillId].name}<br><small>${prog}</small></div>`);
      }
    }
    $('formation-info').innerHTML = parts.join('');
  }

  private renderSkills(state: GameState): void {
    const all = RECIPES.filter((r) => r.ring < state.layout.rings.length).map((r) => SKILLS[r.skillId]);
    $('skills-info').innerHTML = `<h3>Kỹ năng nhân vật</h3>` + all.map((sk) => {
      const unlocked = state.unlockedSkills.includes(sk.id);
      const cd = state.hero.cooldowns[sk.id] ?? 0;
      const dis = !unlocked || cd > 0 || state.hero.mana < sk.manaCost;
      return `<button data-cast="${sk.id}" ${dis ? 'disabled' : ''} title="${sk.desc}">
        ${unlocked ? '✨' : '🔒'} ${sk.name} — ${sk.manaCost} mana${cd > 0 ? ` (CD ${cd.toFixed(0)}s)` : ''}
        <small>${sk.desc}</small></button>`;
    }).join('');
  }

  private renderOverlay(state: GameState): void {
    const ov = $('overlay');
    if (state.phase !== 'won' && state.phase !== 'lost') { ov.classList.add('hidden'); ov.innerHTML = ''; return; }
    ov.classList.remove('hidden');
    const tinh = ELEMENTS.map((e) => `${ELEMENT_NAMES[e]}: ${state.stats.tinhEarned[e]}`).join(' · ');
    ov.innerHTML = `
      <div class="overlay-card">
        <h2>${state.phase === 'won' ? '🏆 CHIẾN THẮNG!' : '💀 THẤT BẠI'}</h2>
        <p>${state.message}</p>
        ${state.endless ? `<p>Đợt Vô Tận đạt được: <b>${state.wave}</b>${state.endlessRecord > 0 ? ` (kỷ lục trước: ${state.endlessRecord})` : ''}</p>` : `<p>Đợt đạt được: <b>${state.wave}/${state.map.waves}</b></p>`}
        <p>Quái đã diệt: <b>${state.stats.kills}</b></p>
        <p>Linh Thạch đã thu: <b>${state.stats.linhThachEarned}</b></p>
        <p>Tinh đã thu — ${tinh}</p>
        <button class="primary" data-restart>↻ Chơi lại</button>
      </div>`;
  }
}
