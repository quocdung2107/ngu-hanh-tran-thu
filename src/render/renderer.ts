import { ELEMENT_COLORS } from '../config/balance';
import { livingTowersInRing, synergyLinks } from '../sim/formation';
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

  // E4: rung màn hình khi trung tâm bị đánh (0.25s, biên độ giảm dần)
  const shakeAge = state.time - state.lastCenterHitAt;
  ctx.save();
  if (shakeAge < 0.25) {
    const amp = 4 * (1 - shakeAge / 0.25);
    ctx.translate(Math.sin(state.time * 95) * amp, Math.cos(state.time * 110) * amp * 0.6);
  }

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
    if (fx.radius > 2) { // tuyệt kỹ lớn: thêm vòng trong + quầng sáng mờ
      const inner = circlePoints(fx.radius * (0.25 + 0.45 * t), 48);
      ctx.globalAlpha = (1 - t) * 0.6; ctx.lineWidth = 2;
      ctx.beginPath(); inner.forEach((pt, i) => (i ? ctx.lineTo(pt.sx, pt.sy) : ctx.moveTo(pt.sx, pt.sy))); ctx.stroke();
      ctx.globalAlpha = (1 - t) * 0.10; ctx.fillStyle = fx.color;
      ctx.beginPath(); pts.forEach((pt, i) => (i ? ctx.lineTo(pt.sx, pt.sy) : ctx.moveTo(pt.sx, pt.sy))); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // vòng trận phát sáng theo số trụ sống của vòng
  for (let ring = 0; ring < state.layout.rings.length; ring++) {
    const living = livingTowersInRing(state, ring);
    const pts = circlePoints(state.layout.rings[ring].radius);
    ctx.beginPath(); pts.forEach((pt, i) => (i ? ctx.lineTo(pt.sx, pt.sy) : ctx.moveTo(pt.sx, pt.sy)));
    ctx.strokeStyle = living >= 3 ? '#ffd94a' : '#5f7d99';
    ctx.globalAlpha = 0.25 + 0.15 * living;
    ctx.lineWidth = living >= 3 ? 3 : 2;
    ctx.shadowColor = '#ffd94a'; ctx.shadowBlur = living * 5;
    ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // E1: đường nối tương sinh (vàng, phát sáng) / tương khắc (đỏ, mờ) giữa trụ kề nhau
  for (const link of synergyLinks(state)) {
    const pa = slotPos(state.layout, link.a), pb = slotPos(state.layout, link.b);
    const a = toScreen(pa.x, pa.y), b = toScreen(pb.x, pb.y);
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 17); ctx.lineTo(b.sx, b.sy - 17);
    if (link.kind === 'sinh') {
      ctx.strokeStyle = '#ffd94a'; ctx.globalAlpha = 0.85; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd94a'; ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = 'rgba(224,90,58,0.6)'; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5;
    }
    ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  // ô trụ + trụ (sắp xếp theo độ sâu)
  const drawables: Array<{ depth: number; draw: () => void }> = [];
  for (let i = 0; i < state.towers.length; i++) {
    const pos = slotPos(state.layout, i);
    const p = toScreen(pos.x, pos.y);
    const tower = state.towers[i];
    drawables.push({
      depth: pos.x + pos.y - 0.01,
      draw: () => {
        const isMach = state.linhMach.includes(i);
        ctx.fillStyle = i === selectedSlot ? 'rgba(255,217,74,0.5)' : isMach ? 'rgba(64,224,208,0.45)' : 'rgba(120,160,200,0.28)';
        diamond(ctx, p.sx, p.sy, 34, 17); ctx.fill();
        ctx.strokeStyle = i === selectedSlot ? '#ffd94a' : isMach ? '#40e0d0' : '#47617c'; ctx.stroke();
        if (isMach) { // dấu Linh Mạch nhấp nháy
          const pulse = 0.6 + 0.4 * Math.sin(state.time * 4);
          ctx.globalAlpha = pulse;
          diamond(ctx, p.sx, p.sy, 20, 10); ctx.strokeStyle = '#a7fff5'; ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (!tower) return;
        const col = ELEMENT_COLORS[tower.element];
        const h = 34 + (tower.level - 1) * 7; // trụ cao dần theo cấp
        ctx.fillStyle = col;
        ctx.fillRect(p.sx - 8, p.sy - h, 16, h);
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.25; ctx.fillRect(p.sx - 8, p.sy - h, 5, h); ctx.globalAlpha = 1;
        diamond(ctx, p.sx, p.sy - h, 22, 11); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#0b111c'; ctx.stroke();
        hpBar(ctx, p.sx, p.sy - h - 12, 30, tower.hp / tower.maxHp, '#7ee787');
        // chấm vàng = cấp trụ
        ctx.fillStyle = '#ffd94a';
        for (let lv = 0; lv < tower.level; lv++) {
          ctx.beginPath(); ctx.arc(p.sx - (tower.level - 1) * 4 + lv * 8, p.sy - h - 18, 2.2, 0, Math.PI * 2); ctx.fill();
        }
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
        const rx = Math.max(5, e.radius * 31), ry = Math.max(6, e.radius * 37);
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy - ry * 0.7, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.strokeStyle = e.isBoss ? '#ffd94a' : '#0b111c'; ctx.lineWidth = e.isBoss ? 2.5 : 1; ctx.stroke(); ctx.lineWidth = 1;
        if (e.role === 'giap') { // Giáp: khung khiên vuông quanh thân
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.strokeRect(p.sx - rx - 3, p.sy - ry * 1.5, (rx + 3) * 2, ry * 1.9);
        }
        if (e.role === 'xa') { // Xa: vòng ngắm
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath(); ctx.arc(p.sx, p.sy - ry * 0.7, rx + 5, 0, Math.PI * 2); ctx.stroke();
        }
        if (e.role === 'hoi') { // Hồi: dấu + xanh lá trên đầu
          ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 2.5;
          const cy = p.sy - ry * 1.7 - 8;
          ctx.beginPath(); ctx.moveTo(p.sx - 5, cy); ctx.lineTo(p.sx + 5, cy); ctx.moveTo(p.sx, cy - 5); ctx.lineTo(p.sx, cy + 5); ctx.stroke();
          ctx.lineWidth = 1;
        }
        if (e.isBoss) { // Boss: vương miện vàng
          ctx.fillStyle = '#ffd94a';
          ctx.beginPath();
          ctx.moveTo(p.sx - 9, p.sy - ry * 1.55); ctx.lineTo(p.sx - 9, p.sy - ry * 1.55 - 8); ctx.lineTo(p.sx - 4, p.sy - ry * 1.55 - 3);
          ctx.lineTo(p.sx, p.sy - ry * 1.55 - 9); ctx.lineTo(p.sx + 4, p.sy - ry * 1.55 - 3); ctx.lineTo(p.sx + 9, p.sy - ry * 1.55 - 8);
          ctx.lineTo(p.sx + 9, p.sy - ry * 1.55); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#0b111c';
        ctx.beginPath(); ctx.arc(p.sx - rx * 0.35, p.sy - ry * 0.85, 1.8, 0, Math.PI * 2); ctx.arc(p.sx + rx * 0.35, p.sy - ry * 0.85, 1.8, 0, Math.PI * 2); ctx.fill();
        if (state.time < e.rootUntil || state.time < e.stunUntil) {
          ctx.strokeStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(p.sx, p.sy - ry * 0.7, rx + 4, 0, Math.PI * 2); ctx.stroke();
        } else if (state.time < e.slowUntil) {
          ctx.strokeStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(p.sx, p.sy - ry * 0.7, rx + 4, 0, Math.PI * 2); ctx.stroke();
        }
        hpBar(ctx, p.sx, p.sy - ry * 1.7 - 4, Math.max(26, rx * 2), e.hp / e.maxHp, e.isBoss ? '#ffd94a' : '#ff7b72');
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

  // E3: dấu điểm đích di chuyển (click-to-move)
  if (state.clickToMove && state.heroMoveTarget) {
    const p = toScreen(state.heroMoveTarget.x, state.heroMoveTarget.y);
    ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.sx, p.sy, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.sx, p.sy - 16); ctx.lineTo(p.sx + 9, p.sy - 12); ctx.lineTo(p.sx, p.sy - 8); ctx.stroke();
    ctx.lineWidth = 1;
  }

  drawables.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());

  // đạn / tia tấn công (hiệu ứng của đòn đánh thật)
  for (const pr of state.projectiles) {
    const a = toScreen(pr.x1, pr.y1), b = toScreen(pr.x2, pr.y2);
    ctx.strokeStyle = pr.element === 'hero' ? '#bfe3ff' : pr.element === 'skill' ? '#ffb37a' : ELEMENT_COLORS[pr.element as keyof typeof ELEMENT_COLORS];
    ctx.globalAlpha = pr.ttl / pr.maxTtl; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 18); ctx.lineTo(b.sx, b.sy - 8); ctx.stroke(); ctx.globalAlpha = 1;
  }
  // E4: hạt hiệu ứng (tuyệt kỹ, nổ Hỏa...)
  for (const pt of state.particles) {
    const p = toScreen(pt.x, pt.y);
    const a = Math.max(0, pt.ttl / pt.maxTtl);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(p.sx, p.sy - 10, pt.size * (0.4 + 0.6 * a), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // số sát thương bay
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  for (const f of state.floaters) {
    const p = toScreen(f.x, f.y);
    ctx.fillStyle = f.color; ctx.globalAlpha = Math.min(1, f.ttl * 2);
    ctx.fillText(f.text, p.sx, p.sy - 30);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
