import { ELEMENT_COLORS, RING_RADII } from '../config/balance';
import { livingTowersInRing } from '../sim/formation';
import { computeHeroStats } from '../sim/hero';
import { slotPos, type GameState } from '../sim/state';
import { circlePoints, toScreen } from './iso';

function hpBar(ctx: CanvasRenderingContext2D, sx: number, sy: number, w: number, ratio: number, color: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(sx - w / 2, sy, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(sx - w / 2, sy, w * Math.max(0, Math.min(1, ratio)), 4);
}

function diamond(ctx: CanvasRenderingContext2D, sx: number, sy: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(sx, sy - h / 2); ctx.lineTo(sx + w / 2, sy); ctx.lineTo(sx, sy + h / 2); ctx.lineTo(sx - w / 2, sy);
  ctx.closePath();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, selectedSlot: number): void {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 430);
  bg.addColorStop(0, '#1d2a3d'); bg.addColorStop(1, '#0b111c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // mặt đất
  const c = toScreen(0, 0);
  ctx.fillStyle = '#16222f';
  diamond(ctx, c.sx, c.sy, 660, 330); ctx.fill();
  ctx.strokeStyle = '#2b4258'; ctx.stroke();

  // hiệu ứng AoE (vẽ dưới thực thể)
  for (const fx of state.aoeFx) {
    const p = toScreen(fx.x, fx.y);
    const t = 1 - fx.ttl / fx.maxTtl;
    ctx.strokeStyle = fx.color; ctx.globalAlpha = 1 - t; ctx.lineWidth = 3;
    const pts = circlePoints(fx.radius * (0.4 + 0.6 * t), 48);
    ctx.beginPath(); pts.forEach((pt, i) => (i ? ctx.lineTo(pt.sx, pt.sy) : ctx.moveTo(pt.sx, pt.sy))); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // vòng trận phát sáng theo số trụ sống của vòng
  for (let ring = 0; ring < 2; ring++) {
    const living = livingTowersInRing(state, ring);
    const pts = circlePoints(RING_RADII[ring]);
    ctx.beginPath(); pts.forEach((pt, i) => (i ? ctx.lineTo(pt.sx, pt.sy) : ctx.moveTo(pt.sx, pt.sy)));
    ctx.strokeStyle = living >= 3 ? '#ffd94a' : '#5f7d99';
    ctx.globalAlpha = 0.25 + 0.15 * living;
    ctx.lineWidth = living >= 3 ? 3 : 2;
    ctx.shadowColor = '#ffd94a'; ctx.shadowBlur = living * 5;
    ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // ô trụ + trụ (sắp xếp theo độ sâu)
  const drawables: Array<{ depth: number; draw: () => void }> = [];
  for (let i = 0; i < state.towers.length; i++) {
    const pos = slotPos(i);
    const p = toScreen(pos.x, pos.y);
    const tower = state.towers[i];
    drawables.push({
      depth: pos.x + pos.y - 0.01,
      draw: () => {
        ctx.fillStyle = i === selectedSlot ? 'rgba(255,217,74,0.5)' : 'rgba(120,160,200,0.28)';
        diamond(ctx, p.sx, p.sy, 34, 17); ctx.fill();
        ctx.strokeStyle = i === selectedSlot ? '#ffd94a' : '#47617c'; ctx.stroke();
        if (!tower) return;
        const col = ELEMENT_COLORS[tower.element];
        const h = 34;
        ctx.fillStyle = col;
        ctx.fillRect(p.sx - 8, p.sy - h, 16, h);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.25; ctx.fillRect(p.sx - 8, p.sy - h, 5, h); ctx.globalAlpha = 1;
        diamond(ctx, p.sx, p.sy - h, 22, 11); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#0b111c'; ctx.stroke();
        hpBar(ctx, p.sx, p.sy - h - 12, 30, tower.hp / tower.maxHp, '#7ee787');
      },
    });
  }

  // trung tâm trận pháp
  drawables.push({
    depth: 0,
    draw: () => {
      const p = toScreen(0, 0);
      ctx.fillStyle = '#8e6fd8';
      diamond(ctx, p.sx, p.sy - 10, 46, 23); ctx.fill();
      ctx.fillRect(p.sx - 5, p.sy - 42, 10, 34);
      ctx.beginPath(); ctx.arc(p.sx, p.sy - 48, 7, 0, Math.PI * 2); ctx.fillStyle = '#d9c6ff'; ctx.fill();
      hpBar(ctx, p.sx, p.sy - 64, 46, state.center.hp / state.center.maxHp, '#c9a7ff');
    },
  });

  // quái
  for (const e of state.enemies) {
    const p = toScreen(e.x, e.y);
    drawables.push({
      depth: e.x + e.y,
      draw: () => {
        const col = ELEMENT_COLORS[e.element];
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy - 8, 10, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#0b111c'; ctx.stroke();
        ctx.fillStyle = '#0b111c';
        ctx.beginPath(); ctx.arc(p.sx - 3.5, p.sy - 10, 1.8, 0, Math.PI * 2); ctx.arc(p.sx + 3.5, p.sy - 10, 1.8, 0, Math.PI * 2); ctx.fill();
        if (state.time < e.rootUntil || state.time < e.stunUntil) {
          ctx.strokeStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 8, 14, 0, Math.PI * 2); ctx.stroke();
        } else if (state.time < e.slowUntil) {
          ctx.strokeStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 8, 14, 0, Math.PI * 2); ctx.stroke();
        }
        hpBar(ctx, p.sx, p.sy - 26, 26, e.hp / e.maxHp, '#ff7b72');
      },
    });
  }

  // nhân vật
  {
    const p = toScreen(state.hero.x, state.hero.y);
    drawables.push({
      depth: state.hero.x + state.hero.y + 0.01,
      draw: () => {
        ctx.fillStyle = '#e8f4ff';
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy - 14, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.sx, p.sy - 32, 6, 0, Math.PI * 2); ctx.fillStyle = '#f6d8a8'; ctx.fill(); ctx.stroke();
        if (state.hero.shield > 0) {
          ctx.strokeStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 16, 20, 0, Math.PI * 2); ctx.stroke();
        }
        hpBar(ctx, p.sx, p.sy - 46, 34, state.hero.hp / computeHeroStats(state).maxHp, '#7ee787');
      },
    });
  }

  drawables.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());

  // đạn / tia tấn công (hiệu ứng của đòn đánh thật)
  for (const pr of state.projectiles) {
    const a = toScreen(pr.x1, pr.y1), b = toScreen(pr.x2, pr.y2);
    ctx.strokeStyle = pr.element === 'hero' ? '#bfe3ff' : pr.element === 'skill' ? '#ffb37a' : ELEMENT_COLORS[pr.element as keyof typeof ELEMENT_COLORS];
    ctx.globalAlpha = pr.ttl / pr.maxTtl; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 18); ctx.lineTo(b.sx, b.sy - 8); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // số sát thương bay
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  for (const f of state.floaters) {
    const p = toScreen(f.x, f.y);
    ctx.fillStyle = f.color; ctx.globalAlpha = Math.min(1, f.ttl * 2);
    ctx.fillText(f.text, p.sx, p.sy - 30);
    ctx.globalAlpha = 1;
  }
}
