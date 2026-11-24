import { TICK_RATE } from './config/balance';
import { render } from './render/renderer';
import { setOrigin, toWorld } from './render/iso';
import { createGame, slotPos, type GameState } from './sim/state';
import { tick } from './sim/combat';
import { buildTower, destroyTowerByPlayer } from './sim/towers';
import { startWave } from './sim/waves';
import { castSkill } from './sim/skills';
import { Hud } from './ui/hud';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
setOrigin(canvas.width / 2, 150);

let state: GameState = createGame();
let paused = false;
let speed = 1;

const hud = new Hud({
  onBuild: (slot, element) => { buildTower(state, slot, element); hud.update(state); },
  onDestroy: (slot) => { destroyTowerByPlayer(state, slot); hud.update(state); },
  onStartWave: () => { startWave(state); hud.update(state); },
  onCastSkill: (skillId) => { castSkill(state, skillId); hud.update(state); },
  onRestart: () => { state = createGame(); hud.selectedSlot = -1; hud.update(state); },
});

canvas.addEventListener('click', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const sx = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (ev.clientY - rect.top) * (canvas.height / rect.height);
  const w = toWorld(sx, sy);
  let best = -1; let bestD = 0.65;
  for (let i = 0; i < state.towers.length; i++) {
    const p = slotPos(i);
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d < bestD) { bestD = d; best = i; }
  }
  hud.selectedSlot = best;
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
  render(ctx, state, hud.selectedSlot);
  hud.update(state);
  requestAnimationFrame(frame);
}
hud.update(state);
requestAnimationFrame(frame);
