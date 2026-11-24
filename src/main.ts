import { HERO, TICK_RATE } from './config/balance';
import { MAPS, mapById } from './config/maps';
import { render } from './render/renderer';
import { setOrigin, toWorld } from './render/iso';
import { createGame, slotPos, type GameState } from './sim/state';
import { tick } from './sim/combat';
import { buildTower, destroyTowerByPlayer, upgradeTower } from './sim/towers';
import { startWave } from './sim/waves';
import { castSkill } from './sim/skills';
import { applyFormationCode, encodeFormation } from './sim/formationCode';
import { buyNode, loadProgress, recordEndlessWave, recordMapWin, recordWaveReached, savePreset, storeProgress, type CampaignProgress } from './persistence';
import { modifiersFromNodes } from './sim/daongo';
import { Hud } from './ui/hud';
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

function startRun(mapId: string, endless = false): void {
  state = createGame(Math.random, mapById(mapId), {
    endless,
    modifiers: modifiersFromNodes(progress.ownedNodes),
    clickToMove: progress.settings.clickToMove,
    endlessRecord: progress.endlessBest[mapId] ?? 0,
  });
  winRecorded = false;
  hud.selectedSlot = -1;
  menu.hide();
  hud.update(state);
}

const menu = new Menu({
  onStart: (mapId, endless) => startRun(mapId, endless),
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
  if (!paused) {
    acc += dtReal * speed;
    const step = 1 / TICK_RATE;
    while (acc >= step) { tick(state, step); acc -= step; }
  }
  trackProgress();
  for (const key of state.sounds) sound.play(key);
  state.sounds.length = 0;
  render(ctx, state, hud.selectedSlot);
  hud.update(state);
  requestAnimationFrame(frame);
}
menu.show(progress);
hud.update(state);
requestAnimationFrame(frame);
