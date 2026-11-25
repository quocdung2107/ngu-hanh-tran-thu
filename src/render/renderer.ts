// E6 — Renderer chế độ thủ trận trên BẢN ĐỒ LỚN: camera bám nhân vật (gốc chiếu
// đặt theo state.camera mỗi frame), vẽ THEO LỚP cố định như Dã Chiến
// (src/config/sprites.ts): ground → groundFx → shadow → entity (sắp theo Y)
// → projectile → fx, và CULLING mọi thứ ngoài khung hình.
// Trụ/trung tâm/nhân vật tra SpriteRegistry theo spriteId: có ảnh thì vẽ ảnh,
// chưa có thì vẽ hình khối placeholder như trước. Sim là nguồn sự thật duy nhất —
// file này chỉ trình bày, không đổi kết quả gameplay.
import { ELEMENT_COLORS } from '../config/balance';
import { spriteRegistry, towerSpriteId } from '../config/sprites';
import { livingTowersInRing, synergyLinks } from '../sim/formation';
import { computeHeroStats } from '../sim/hero';
import { slotPos, type GameState } from '../sim/state';
import { drawSpriteImage } from './fieldRenderer';
import { circlePoints, setOriginForCamera, toScreen } from './iso';

type Ctx = CanvasRenderingContext2D;

function hpBar(ctx: Ctx, sx: number, sy: number, w: number, ratio: number, color: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(sx - w / 2, sy, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(sx - w / 2, sy, w * Math.max(0, Math.min(1, ratio)), 4);
}

function diamond(ctx: Ctx, sx: number, sy: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(sx, sy - h / 2); ctx.lineTo(sx + w / 2, sy); ctx.lineTo(sx, sy + h / 2); ctx.lineTo(sx - w / 2, sy);
  ctx.closePath();
}

function hash2(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

export function render(ctx: Ctx, state: GameState, selectedSlot: number): void {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const cam = state.camera;
  const half = state.map.worldSize / 2;
  const onScreen = (sx: number, sy: number, m = 80) => sx >= -m && sx <= W + m && sy >= -m && sy <= H + m;

  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 520);
  bg.addColorStop(0, '#1d2a3d'); bg.addColorStop(1, '#0b111c');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // gốc chiếu theo camera: điểm camera nằm giữa canvas (main dùng cùng phép này khi picking)
  setOriginForCamera(W, H, cam.x, cam.y);

  // E4: rung màn hình khi trung tâm bị đánh (0.25s, biên độ giảm dần)
  const shakeAge = state.time - state.lastCenterHitAt;
  ctx.save();
  if (shakeAge < 0.25) {
    const amp = 4 * (1 - shakeAge / 0.25);
    ctx.translate(Math.sin(state.time * 95) * amp, Math.cos(state.time * 110) * amp * 0.6);
  }

  // ===== Lớp 1: ground — ô nền quanh camera + biên bản đồ + vòng trận =====
  {
    const t = 4; // cỡ ô nền (đơn vị thế giới)
    const span = 22; // vùng thế giới quanh camera cần quét ô (đủ phủ khung hình iso)
    const tx0 = Math.max(-half, Math.floor((cam.x - span) / t) * t);
    const tx1 = Math.min(half - t, Math.floor((cam.x + span) / t) * t);
    const ty0 = Math.max(-half, Math.floor((cam.y - span) / t) * t);
    const ty1 = Math.min(half - t, Math.floor((cam.y + span) / t) * t);
    for (let wx = tx0; wx <= tx1; wx += t) {
      for (let wy = ty0; wy <= ty1; wy += t) {
        const c = toScreen(wx + t / 2, wy + t / 2);
        if (!onScreen(c.sx, c.sy, 200)) continue;
        const a = toScreen(wx, wy), b = toScreen(wx + t, wy), d = toScreen(wx + t, wy + t), e = toScreen(wx, wy + t);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(d.sx, d.sy); ctx.lineTo(e.sx, e.sy);
        ctx.closePath();
        ctx.fillStyle = ((wx / t + wy / t) % 2 === 0) ? '#16222f' : '#141f2c';
        ctx.fill();
        ctx.strokeStyle = 'rgba(43,66,88,0.45)';
        ctx.stroke();
        const h = hash2(wx, wy);
        if (h < 0.14) {
          ctx.fillStyle = 'rgba(120,140,160,0.45)';
          ctx.beginPath(); ctx.ellipse(c.sx, c.sy, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
        } else if (h < 0.27) {
          ctx.strokeStyle = 'rgba(70,140,110,0.6)'; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(c.sx - 5, c.sy); ctx.lineTo(c.sx - 3, c.sy - 8);
          ctx.moveTo(c.sx, c.sy); ctx.lineTo(c.sx, c.sy - 10);
          ctx.moveTo(c.sx + 5, c.sy); ctx.lineTo(c.sx + 3, c.sy - 8);
          ctx.stroke(); ctx.lineWidth = 1;
        }
      }
    }
    // biên bản đồ
    const corners = [toScreen(-half, -half), toScreen(half, -half), toScreen(half, half), toScreen(-half, half)];
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,120,90,0.55)'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;

    // vòng trận phát sáng theo số trụ sống của vòng (ở tâm bản đồ)
    const c0 = toScreen(0, 0);
    if (onScreen(c0.sx, c0.sy, 320)) {
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
    }
  }

  // ===== Lớp 2: groundFx — hiệu ứng AoE trên đất, ô trụ, nối sinh/khắc, đích đến =====
  for (const fx of state.aoeFx) {
    const p = toScreen(fx.x, fx.y);
    if (!onScreen(p.sx, p.sy, 260)) continue;
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
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  // ô trụ (nền ô — thân trụ vẽ ở lớp entity)
  for (let i = 0; i < state.towers.length; i++) {
    const pos = slotPos(state.layout, i);
    const p = toScreen(pos.x, pos.y);
    if (!onScreen(p.sx, p.sy)) continue;
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
  }

  // E1: đường nối tương sinh (vàng, phát sáng) / tương khắc (đỏ, mờ) giữa trụ kề nhau
  for (const link of synergyLinks(state)) {
    const pa = slotPos(state.layout, link.a), pb = slotPos(state.layout, link.b);
    const a = toScreen(pa.x, pa.y), b = toScreen(pb.x, pb.y);
    if (!onScreen(a.sx, a.sy, 120) && !onScreen(b.sx, b.sy, 120)) continue;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 17); ctx.lineTo(b.sx, b.sy - 17);
    if (link.kind === 'sinh') {
      ctx.strokeStyle = '#ffd94a'; ctx.globalAlpha = 0.85; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd94a'; ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = 'rgba(224,90,58,0.6)'; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.5;
    }
    ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  // E6: dấu điểm đích di chuyển (WASD/click — luôn bật ở thủ trận)
  if (state.heroMoveTarget) {
    const p = toScreen(state.heroMoveTarget.x, state.heroMoveTarget.y);
    if (onScreen(p.sx, p.sy)) {
      ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.sx, p.sy - 16); ctx.lineTo(p.sx + 9, p.sy - 12); ctx.lineTo(p.sx, p.sy - 8); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  // ===== Lớp 3: shadow — bóng thực thể =====
  const drawShadow = (x: number, y: number, rx: number) => {
    const p = toScreen(x, y);
    if (!onScreen(p.sx, p.sy)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rx, rx / 2, 0, 0, Math.PI * 2); ctx.fill();
  };
  for (let i = 0; i < state.towers.length; i++) {
    if (!state.towers[i]) continue;
    const pos = slotPos(state.layout, i);
    drawShadow(pos.x, pos.y, 13);
  }
  drawShadow(0, 0, 22);
  for (const e of state.enemies) drawShadow(e.x, e.y, Math.max(6, e.radius * 30));
  drawShadow(state.hero.x, state.hero.y, 11);

  // ===== Lớp 4: entity — sắp theo Y (x+y tăng dần) =====
  const drawables: Array<{ depth: number; draw: () => void }> = [];
  for (let i = 0; i < state.towers.length; i++) {
    const tower = state.towers[i];
    if (!tower) continue;
    const pos = slotPos(state.layout, i);
    const p = toScreen(pos.x, pos.y);
    if (!onScreen(p.sx, p.sy, 120)) continue;
    drawables.push({
      depth: pos.x + pos.y - 0.01,
      draw: () => {
        const col = ELEMENT_COLORS[tower.element];
        // E6: có ảnh thật trong manifest thì vẽ ảnh (neo chân), chưa có → trụ khối
        if (drawSpriteImage(ctx, spriteRegistry.resolve(towerSpriteId(tower.element)), p.sx, p.sy, 1.25)) {
          hpBar(ctx, p.sx, p.sy - 52, 30, tower.hp / tower.maxHp, '#7ee787');
          return;
        }
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
  {
    const p = toScreen(0, 0);
    if (onScreen(p.sx, p.sy, 140)) {
      drawables.push({
        depth: 0,
        draw: () => {
          if (drawSpriteImage(ctx, spriteRegistry.resolve('center'), p.sx, p.sy, 1.6)) {
            hpBar(ctx, p.sx, p.sy - 66, 46, state.center.hp / state.center.maxHp, '#c9a7ff');
            return;
          }
          ctx.fillStyle = '#8e6fd8';
          diamond(ctx, p.sx, p.sy - 10, 46, 23); ctx.fill();
          ctx.fillRect(p.sx - 5, p.sy - 42, 10, 34);
          ctx.beginPath(); ctx.arc(p.sx, p.sy - 48, 7, 0, Math.PI * 2); ctx.fillStyle = '#d9c6ff'; ctx.fill();
          hpBar(ctx, p.sx, p.sy - 64, 46, state.center.hp / state.center.maxHp, '#c9a7ff');
        },
      });
    }
  }

  // quái
  for (const e of state.enemies) {
    const p = toScreen(e.x, e.y);
    if (!onScreen(p.sx, p.sy, 100)) continue;
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
    if (onScreen(p.sx, p.sy, 100)) {
      drawables.push({
        depth: state.hero.x + state.hero.y + 0.01,
        draw: () => {
          if (drawSpriteImage(ctx, spriteRegistry.resolve('hero'), p.sx, p.sy, 1.05)) {
            hpBar(ctx, p.sx, p.sy - 52, 34, state.hero.hp / computeHeroStats(state).maxHp, '#7ee787');
            return;
          }
          ctx.fillStyle = '#e8f4ff';
          ctx.beginPath(); ctx.ellipse(p.sx, p.sy - 14, 9, 14, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.sx, p.sy - 32, 6, 0, Math.PI * 2); ctx.fillStyle = '#f6d8a8'; ctx.fill(); ctx.stroke();
          ctx.lineWidth = 1;
          if (state.hero.shield > 0) {
            ctx.strokeStyle = '#ffd94a'; ctx.beginPath(); ctx.arc(p.sx, p.sy - 16, 20, 0, Math.PI * 2); ctx.stroke();
          }
          hpBar(ctx, p.sx, p.sy - 46, 34, state.hero.hp / computeHeroStats(state).maxHp, '#7ee787');
        },
      });
    }
  }

  drawables.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());

  // ===== Lớp 5: projectile — đạn / tia tấn công (hiệu ứng của đòn đánh thật) =====
  for (const pr of state.projectiles) {
    const a = toScreen(pr.x1, pr.y1), b = toScreen(pr.x2, pr.y2);
    if (!onScreen(a.sx, a.sy, 120) && !onScreen(b.sx, b.sy, 120)) continue;
    ctx.strokeStyle = pr.element === 'hero' ? '#bfe3ff' : pr.element === 'skill' ? '#ffb37a' : ELEMENT_COLORS[pr.element as keyof typeof ELEMENT_COLORS];
    ctx.globalAlpha = pr.ttl / pr.maxTtl; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 18); ctx.lineTo(b.sx, b.sy - 8); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  // ===== Lớp 6: fx — hạt hiệu ứng + số sát thương bay =====
  for (const pt of state.particles) {
    const p = toScreen(pt.x, pt.y);
    if (!onScreen(p.sx, p.sy)) continue;
    const a = Math.max(0, pt.ttl / pt.maxTtl);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(p.sx, p.sy - 10, pt.size * (0.4 + 0.6 * a), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  for (const f of state.floaters) {
    const p = toScreen(f.x, f.y);
    if (!onScreen(p.sx, p.sy)) continue;
    ctx.fillStyle = f.color; ctx.globalAlpha = Math.min(1, f.ttl * 2);
    ctx.fillText(f.text, p.sx, p.sy - 30);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
