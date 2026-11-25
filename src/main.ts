import { HERO, TICK_RATE } from './config/balance';
import { FIELD, FIELD_SKILLS } from './config/field';
import { MAPS, mapById } from './config/maps';
import { render } from './render/renderer';
import { renderField, fieldScreenToWorld } from './render/fieldRenderer';
import { setOrigin, toWorld, TILE_H, TILE_W } from './render/iso';
import { castFieldSkill, createFieldGame, tickField, type FieldState } from './sim/field';
import { createGame, slotPos, type GameState } from './sim/state';
import { tick } from './sim/combat';
import { buildTower, destroyTowerByPlayer, upgradeTower } from './sim/towers';
import { startWave } from './sim/waves';
import { castSkill } from './sim/skills';
import { applyFormationCode, encodeFormation } from './sim/formationCode';
import { buyNode, loadProgress, recordEndlessWave, recordMapWin, recordWaveReached, savePreset, storeProgress, type CampaignProgress } from './persistence';
import { modifiersFromNodes } from './sim/daongo';
import { Hud } from './ui/hud';
import { FieldHud } from './ui/fieldHud';
import { SoundEngine } from './ui/audio';
import { Menu } from './ui/menu';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
setOrigin(canvas.width / 2, 150);

let progress: CampaignProgress = loadProgress();
const sound = new SoundEngine();
sound.muted = progress.settings.muted;
sound.volume = progress.settings.volume;
// Mở khóa AudioContext ở tương tác đầu tiên (chính sách trình duyệt)
window.addEventListener('pointerdown', () => sound.unlock(), { once: true });
let state: GameState = createGame(Math.random, MAPS[0]);
let paused = false;
let speed = 1;
let winRecorded = false;

// E5 — Chế độ Dã Chiến song song với thủ trận pháp (không thay thế nhau).
let mode: 'defense' | 'field' = 'defense';
let field: FieldState = createFieldGame(Math.random);
const hintEl = document.getElementById('hint')!;
const HINT_DEFENSE = hintEl.textContent;
const HINT_FIELD = 'Dã Chiến: WASD / phím mũi tên để chạy, click chuột để ra lệnh di chuyển. Nhân vật tự bắn loạt đạn vào bầy quái — sống sót 5 phút là thắng. Phím 1/2/3 dùng kỹ năng.';

function setModeUi(): void {
  document.getElementById('side')!.style.display = mode === 'defense' ? '' : 'none';
  document.getElementById('field-side')!.style.display = mode === 'field' ? 'flex' : 'none';
  hintEl.textContent = mode === 'field' ? HINT_FIELD : HINT_DEFENSE;
}

function startRun(mapId: string, endless = false): void {
  mode = 'defense';
  state = createGame(Math.random, mapById(mapId), {
    endless,
    modifiers: modifiersFromNodes(progress.ownedNodes),
    clickToMove: progress.settings.clickToMove,
    endlessRecord: progress.endlessBest[mapId] ?? 0,
  });
  winRecorded = false;
  hud.selectedSlot = -1;
  menu.hide();
  setModeUi();
  hud.update(state);
}

function startFieldRun(): void {
  mode = 'field';
  field = createFieldGame(Math.random);
  menu.hide();
  setModeUi();
  fieldHud.update(field);
}

const menu = new Menu({
  onStart: (mapId, endless) => startRun(mapId, endless),
  onStartField: () => startFieldRun(),
  onBuyNode: (nodeId) => {
    const result = buyNode(progress, nodeId);
    if (result.ok) { progress = result.progress; storeProgress(progress); }
    menu.show(progress);
  },
  onToggleClickToMove: (enabled) => {
    progress = { ...progress, settings: { ...progress.settings, clickToMove: enabled } };
    storeProgress(progress);
    state.clickToMove = enabled;
  },
});

const hud = new Hud({
  onBuild: (slot, element) => { if (buildTower(state, slot, element)) sound.play('build'); hud.update(state); },
  onDestroy: (slot) => { if (destroyTowerByPlayer(state, slot)) sound.play('destroy'); hud.update(state); },
  onUpgrade: (slot) => { if (upgradeTower(state, slot)) sound.play('upgrade'); hud.update(state); },
  onStartWave: () => { if (startWave(state)) sound.play('waveStart'); hud.update(state); },
  onCastSkill: (skillId) => { castSkill(state, skillId); hud.update(state); },
  onRestart: () => { startRun(state.map.id, state.endless); },
  onExportPreset: () => {
    const code = encodeFormation(state);
    progress = storeAndReturn(savePreset(progress, state.map.id, code));
    return code;
  },
  onImportPreset: (code) => {
    const report = applyFormationCode(state, code);
    hud.update(state);
    if (!report.ok) return `❌ ${report.reason}`;
    return `✅ Đã dựng ${report.placed} trụ (nâng cấp ${report.upgraded} lần)${report.skipped ? `, bỏ qua ${report.skipped} trụ vì thiếu tài nguyên` : ''}.`;
  },
});

const fieldHud = new FieldHud({
  onCastSkill: (skillId) => { castFieldSkill(field, skillId); fieldHud.update(field); },
  onRestart: () => { startFieldRun(); },
});

// E5: phím di chuyển (WASD/mũi tên) + phím kỹ năng 1/2/3 cho Dã Chiến
const keysDown = new Set<string>();
window.addEventListener('keydown', (ev) => {
  if (mode !== 'field') return;
  if (ev.code.startsWith('Arrow')) ev.preventDefault();
  keysDown.add(ev.code);
  const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(ev.code);
  if (idx >= 0 && FIELD_SKILLS[idx]) castFieldSkill(field, FIELD_SKILLS[idx].id);
});
window.addEventListener('keyup', (ev) => { keysDown.delete(ev.code); });
window.addEventListener('blur', () => keysDown.clear());

/** Đổi hướng phím (không gian màn hình) sang hướng thế giới isometric. */
function keysToWorldInput(): { x: number; y: number } {
  let sx = 0, sy = 0;
  if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) sy -= 1;
  if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) sy += 1;
  if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) sx -= 1;
  if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) sx += 1;
  return {
    x: sx / (TILE_W / 2) + sy / (TILE_H / 2),
    y: sy / (TILE_H / 2) - sx / (TILE_W / 2),
  };
}

function storeAndReturn(p: CampaignProgress): CampaignProgress {
  storeProgress(p);
  return p;
}

/** Ghi tiến độ chiến dịch khi ván đổi trạng thái (thắng / đạt đợt mới). */
function trackProgress(): void {
  const before = JSON.stringify(progress);
  progress = recordWaveReached(progress, state.map.id, state.wave);
  if (state.phase === 'won' && !winRecorded) {
    winRecorded = true;
    sound.play('win');
    progress = recordMapWin(progress, state.map.id);
  }
  if (state.phase === 'lost' && !state.endless && !winRecorded) {
    winRecorded = true;
    sound.play('lose');
  }
  if (state.endless && state.phase === 'lost' && !winRecorded) {
    winRecorded = true;
    sound.play('lose');
    progress = recordEndlessWave(progress, state.map.id, state.wave);
  }
  if (JSON.stringify(progress) !== before) storeProgress(progress);
}

canvas.addEventListener('click', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const sx = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (ev.clientY - rect.top) * (canvas.height / rect.height);
  if (mode === 'field') {
    // E5: click = ra lệnh di chuyển tới điểm đó (kẹp trong bản đồ)
    const w = fieldScreenToWorld(canvas, field.camera, sx, sy);
    const m = 0.5;
    field.hero.moveTarget = {
      x: Math.min(FIELD.worldW - m, Math.max(m, w.x)),
      y: Math.min(FIELD.worldH - m, Math.max(m, w.y)),
    };
    return;
  }
  const w = toWorld(sx, sy);
  let best = -1; let bestD = 0.65;
  for (let i = 0; i < state.towers.length; i++) {
    const p = slotPos(state.layout, i);
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d < bestD) { bestD = d; best = i; }
  }
  hud.selectedSlot = best;
  // E3: click vào khoảng trống (không trúng ô trụ) = lệnh di chuyển khi bật click-to-move
  if (best < 0 && state.clickToMove) {
    const d = Math.hypot(w.x, w.y);
    const k = d > HERO.homeRadius ? HERO.homeRadius / d : 1;
    state.heroMoveTarget = { x: w.x * k, y: w.y * k };
  }
  hud.update(state);
});

const btnPause = document.getElementById('btn-pause')!;
btnPause.addEventListener('click', () => {
  paused = !paused;
  btnPause.textContent = paused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
});
const btnSpeed = document.getElementById('btn-speed')!;
btnSpeed.addEventListener('click', () => {
  speed = speed === 1 ? 2 : 1;
  btnSpeed.textContent = `Tốc độ: ${speed}x`;
});
document.getElementById('btn-menu')!.addEventListener('click', () => {
  menu.show(progress);
});
const btnMute = document.getElementById('btn-mute')!;
const volInput = document.getElementById('vol') as HTMLInputElement;
function syncAudioUi(): void {
  btnMute.textContent = sound.muted ? '🔇' : '🔊';
  volInput.value = String(Math.round(sound.volume * 100));
}
btnMute.addEventListener('click', () => {
  sound.unlock();
  sound.setMuted(!sound.muted);
  progress = { ...progress, settings: { ...progress.settings, muted: sound.muted } };
  storeProgress(progress);
  syncAudioUi();
});
volInput.addEventListener('input', () => {
  sound.unlock();
  sound.setVolume(Number(volInput.value) / 100);
  progress = { ...progress, settings: { ...progress.settings, volume: sound.volume } };
  storeProgress(progress);
});
syncAudioUi();

let acc = 0;
let last = performance.now();
function frame(now: number): void {
  const dtReal = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (mode === 'field') field.hero.input = keysToWorldInput();
  if (!paused) {
    acc += dtReal * speed;
    const step = 1 / TICK_RATE;
    while (acc >= step) {
      if (mode === 'field') tickField(field, step); else tick(state, step);
      acc -= step;
    }
  }
  if (mode === 'field') {
    for (const key of field.sounds) sound.play(key);
    field.sounds.length = 0;
    renderField(ctx, field);
    fieldHud.update(field);
  } else {
    trackProgress();
    for (const key of state.sounds) sound.play(key);
    state.sounds.length = 0;
    render(ctx, state, hud.selectedSlot);
    hud.update(state);
  }
  requestAnimationFrame(frame);
}
menu.show(progress);
hud.update(state);
requestAnimationFrame(frame);
