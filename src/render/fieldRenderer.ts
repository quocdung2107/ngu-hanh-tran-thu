// E5 — Renderer chế độ Dã Chiến: vẽ THEO LỚP cố định (src/config/sprites.ts):
//   ground → groundFx → shadow → entity (sắp theo Y) → projectile → fx
// Mỗi thực thể tra SpriteRegistry theo spriteId: có ảnh trong manifest thì vẽ
// ảnh, chưa có thì vẽ hình khối theo màu hệ. Chỉ vẽ thứ nằm trong khung hình.
import { ELEMENT_COLORS } from '../config/balance';
import { FIELD } from '../config/field';
import { enemySpriteId, spriteRegistry, type ResolvedSprite } from '../config/sprites';
import type { FieldEnemy, FieldState } from '../sim/field';
import { TILE_H, TILE_W } from './iso';

type Ctx = CanvasRenderingContext2D;

export function fieldToScreen(canvas: HTMLCanvasElement, cam: { x: number; y: number }, x: number, y: number): { sx: number; sy: number } {
  return {
    sx: canvas.width / 2 + ((x - cam.x) - (y - cam.y)) * (TILE_W / 2),
    sy: canvas.height / 2 + ((x - cam.x) + (y - cam.y)) * (TILE_H / 2),
  };
}

export function fieldScreenToWorld(canvas: HTMLCanvasElement, cam: { x: number; y: number }, sx: number, sy: number): { x: number; y: number } {
  const dx = (sx - canvas.width / 2) / (TILE_W / 2);
  const dy = (sy - canvas.height / 2) / (TILE_H / 2);
  return { x: cam.x + (dx + dy) / 2, y: cam.y + (dy - dx) / 2 };
}

function hash2(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function hpBar(ctx: Ctx, sx: number, sy: number, w: number, ratio: number, color: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(sx - w / 2, sy, w, 4);
  ctx.fillStyle = color;
  ctx.fillRect(sx - w / 2, sy, w * Math.max(0, Math.min(1, ratio)), 4);
}

/** Vẽ ảnh sprite nếu manifest có và ảnh đã nạp xong; trả false để renderer rơi về hình khối. */
function drawSpriteImage(ctx: Ctx, r: ResolvedSprite, sx: number, sy: number, sizeWorld: number): boolean {
  if (r.kind !== 'image' || !r.img) return false;
  const img = r.img;
  if (!img.complete || img.naturalWidth === 0) return false;
  const drawH = sizeWorld * TILE_H * 2 * r.entry.scale;
  const drawW = drawH * (img.naturalWidth / img.naturalHeight);
  ctx.drawImage(img, sx - drawW * r.entry.anchorX, sy - drawH * r.entry.anchorY, drawW, drawH);
  return true;
}

export function renderField(ctx: Ctx, state: FieldState): void {
  const canvas = ctx.canvas;
  const W = canvas.width, H = canvas.height;
  const cam = state.camera;
  const P = (x: number, y: number) => fieldToScreen(canvas, cam, x, y);
  const onScreen = (sx: number, sy: number, m = 70) => sx >= -m && sx <= W + m && sy >= -m && sy <= H + m;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0d1622';
  ctx.fillRect(0, 0, W, H);

  // ===== Lớp 1: ground — ô nền + trang trí, chỉ phần trong khung hình =====
  const t = FIELD.tileSize;
  const span = FIELD.viewW / 2 + FIELD.viewH / 2 + t;
  const tx0 = Math.max(0, Math.floor((cam.x - span) / t)), tx1 = Math.min(FIELD.worldW / t - 1, Math.floor((cam.x + span) / t));
  const ty0 = Math.max(0, Math.floor((cam.y - span) / t)), ty1 = Math.min(FIELD.worldH / t - 1, Math.floor((cam.y + span) / t));
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const x0 = tx * t, y0 = ty * t;
      const c = P(x0 + t / 2, y0 + t / 2);
      if (!onScreen(c.sx, c.sy, 190)) continue;
      const a = P(x0, y0), b = P(x0 + t, y0), d = P(x0 + t, y0 + t), e = P(x0, y0 + t);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(d.sx, d.sy); ctx.lineTo(e.sx, e.sy);
      ctx.closePath();
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#16222f' : '#141f2c';
      ctx.fill();
      ctx.strokeStyle = 'rgba(43,66,88,0.5)';
      ctx.stroke();
      const h = hash2(tx, ty);
      if (h < 0.16) { // tảng đá placeholder
        ctx.fillStyle = 'rgba(120,140,160,0.5)';
        ctx.beginPath(); ctx.ellipse(c.sx, c.sy, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      } else if (h < 0.3) { // bụi cỏ placeholder
        ctx.strokeStyle = 'rgba(70,140,110,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.sx - 5, c.sy); ctx.lineTo(c.sx - 3, c.sy - 8);
        ctx.moveTo(c.sx, c.sy); ctx.lineTo(c.sx, c.sy - 10);
        ctx.moveTo(c.sx + 5, c.sy); ctx.lineTo(c.sx + 3, c.sy - 8);
        ctx.stroke(); ctx.lineWidth = 1;
      }
    }
  }
  // biên bản đồ
  {
    const corners = [P(0, 0), P(FIELD.worldW, 0), P(FIELD.worldW, FIELD.worldH), P(0, FIELD.worldH)];
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,120,90,0.55)'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  }

  // ===== Lớp 2: groundFx — vật phẩm rơi, vòng kỹ năng trên đất, dấu đích đến =====
  for (const fx of state.aoeFx) {
    const p = P(fx.x, fx.y);
    if (!onScreen(p.sx, p.sy, 200)) continue;
    const k = 1 - fx.ttl / fx.maxTtl;
    ctx.strokeStyle = fx.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const q = P(fx.x + Math.cos(a) * fx.radius * (0.4 + 0.6 * k), fx.y + Math.sin(a) * fx.radius * (0.4 + 0.6 * k));
      i ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy);
    }
    ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }
  for (const pk of state.pickups) {
    const p = P(pk.x, pk.y);
    if (!onScreen(p.sx, p.sy)) continue;
    const bob = Math.sin(state.time * 3 + pk.id) * 2;
    const r = spriteRegistry.resolve(pk.kind === 'lt' ? 'pickup-lt' : 'pickup-tinh');
    if (drawSpriteImage(ctx, r, p.sx, p.sy + bob, 0.5)) continue;
    if (pk.kind === 'lt') {
      ctx.fillStyle = '#7ee7f5';
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy - 8 + bob); ctx.lineTo(p.sx + 6, p.sy + bob); ctx.lineTo(p.sx, p.sy + 8 + bob); ctx.lineTo(p.sx - 6, p.sy + bob);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e6fbff'; ctx.stroke();
    } else {
      ctx.fillStyle = ELEMENT_COLORS[pk.element];
      ctx.beginPath(); ctx.arc(p.sx, p.sy + bob, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
    }
    if (pk.magnet) { // vệt hút mờ
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      const hp = P(state.hero.x, state.hero.y);
      ctx.beginPath(); ctx.moveTo(p.sx, p.sy + bob); ctx.lineTo(hp.sx, hp.sy - 10); ctx.stroke();
    }
  }
  if (state.hero.moveTarget) {
    const p = P(state.hero.moveTarget.x, state.hero.moveTarget.y);
    ctx.strokeStyle = '#7ee787'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.sx, p.sy, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.sx, p.sy - 15); ctx.lineTo(p.sx + 9, p.sy - 11); ctx.lineTo(p.sx, p.sy - 7); ctx.stroke();
    ctx.lineWidth = 1;
  }

  // ===== Lớp 3: shadow — bóng thực thể =====
  const drawShadow = (x: number, y: number, size: number) => {
    const p = P(x, y);
    if (!onScreen(p.sx, p.sy)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, size * 15, size * 7.5, 0, 0, Math.PI * 2); ctx.fill();
  };
  for (const e of state.enemies) drawShadow(e.x, e.y, e.size);
  drawShadow(state.hero.x, state.hero.y, FIELD.hero.size);

  // ===== Lớp 4: entity — sắp theo Y (x+y tăng dần: đứng dưới vẽ sau) =====
  const drawEnemy = (e: FieldEnemy) => {
    const p = P(e.x, e.y);
    if (!onScreen(p.sx, p.sy)) return;
    const r = spriteRegistry.resolve(enemySpriteId(e.element, e.kind));
    if (drawSpriteImage(ctx, r, p.sx, p.sy, e.size)) {
      hpBar(ctx, p.sx, p.sy - e.size * 62, 34, e.hp / e.maxHp, e.kind === 'normal' ? '#ff7b72' : '#ffd94a');
      return;
    }
    const col = r.kind === 'shape' ? r.def.color : ELEMENT_COLORS[e.element];
    const rx = e.size * 24, ry = e.size * 28;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy - ry * 0.72, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = e.kind === 'normal' ? '#0b111c' : '#ffd94a';
    ctx.lineWidth = e.kind === 'normal' ? 1 : 2.5; ctx.stroke(); ctx.lineWidth = 1;
    if (e.kind === 'boss') { // vương miện
      ctx.fillStyle = '#ffd94a';
      const cy = p.sy - ry * 1.62;
      ctx.beginPath();
      ctx.moveTo(p.sx - 10, cy); ctx.lineTo(p.sx - 10, cy - 9); ctx.lineTo(p.sx - 4, cy - 3);
      ctx.lineTo(p.sx, cy - 10); ctx.lineTo(p.sx + 4, cy - 3); ctx.lineTo(p.sx + 10, cy - 9); ctx.lineTo(p.sx + 10, cy);
      ctx.closePath(); ctx.fill();
    }
    if (e.kind === 'elite') {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(p.sx, p.sy - ry * 0.72, rx + 4, ry + 4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#0b111c';
    ctx.beginPath();
    ctx.arc(p.sx - rx * 0.35, p.sy - ry * 0.9, 2, 0, Math.PI * 2);
    ctx.arc(p.sx + rx * 0.35, p.sy - ry * 0.9, 2, 0, Math.PI * 2);
    ctx.fill();
    if (state.time < e.rootUntil || state.time < e.stunUntil) {
      ctx.strokeStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(p.sx, p.sy - ry * 0.72, rx + 5, 0, Math.PI * 2); ctx.stroke();
    } else if (state.time < e.slowUntil) {
      ctx.strokeStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(p.sx, p.sy - ry * 0.72, rx + 5, 0, Math.PI * 2); ctx.stroke();
    }
    hpBar(ctx, p.sx, p.sy - ry * 1.78, Math.max(28, rx * 1.7), e.hp / e.maxHp, e.kind === 'normal' ? '#ff7b72' : '#ffd94a');
  };
  const drawHero = () => {
    const h = state.hero;
    const p = P(h.x, h.y);
    const r = spriteRegistry.resolve('hero');
    if (drawSpriteImage(ctx, r, p.sx, p.sy, FIELD.hero.size)) {
      hpBar(ctx, p.sx, p.sy - 62, 38, h.hp / h.maxHp, '#7ee787');
      return;
    }
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy - 15, 10, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.sx, p.sy - 35, 6.5, 0, Math.PI * 2); ctx.fillStyle = '#f6d8a8'; ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1;
    // vòng sáng dưới chân như ảnh tham chiếu
    ctx.strokeStyle = 'rgba(110,200,255,0.8)';
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, 17, 8, 0, 0, Math.PI * 2); ctx.stroke();
    hpBar(ctx, p.sx, p.sy - 50, 38, h.hp / h.maxHp, '#7ee787');
  };
  const entities: Array<{ depth: number; draw: () => void }> = state.enemies.map((e) => ({
    depth: e.x + e.y, draw: () => drawEnemy(e),
  }));
  entities.push({ depth: state.hero.x + state.hero.y + 0.01, draw: drawHero });
  entities.sort((a, b) => a.depth - b.depth).forEach((d) => d.draw());

  // ===== Lớp 5: projectile — tia đạn phát sáng =====
  for (const pr of state.projectiles) {
    const head = P(pr.x, pr.y);
    const tail = P(pr.x - pr.vx * 0.035, pr.y - pr.vy * 0.035);
    if (!onScreen(head.sx, head.sy)) continue;
    ctx.strokeStyle = pr.crit ? '#ffd94a' : '#9fd8ff';
    ctx.lineWidth = pr.crit ? 3 : 2;
    ctx.shadowColor = pr.crit ? '#ffd94a' : '#4aa8e0'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.moveTo(tail.sx, tail.sy - 12); ctx.lineTo(head.sx, head.sy - 12); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1;
  }

  // ===== Lớp 6: fx — hạt + số sát thương bay =====
  for (const pt of state.particles) {
    const p = P(pt.x, pt.y);
    if (!onScreen(p.sx, p.sy)) continue;
    const a = Math.max(0, pt.ttl / pt.maxTtl);
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(p.sx, p.sy - 10, pt.size * (0.4 + 0.6 * a), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  for (const f of state.floaters) {
    const p = P(f.x, f.y);
    if (!onScreen(p.sx, p.sy)) continue;
    ctx.fillStyle = f.color; ctx.globalAlpha = Math.min(1, f.ttl * 2);
    ctx.fillText(f.text, p.sx, p.sy - 34);
    ctx.globalAlpha = 1;
  }
}
