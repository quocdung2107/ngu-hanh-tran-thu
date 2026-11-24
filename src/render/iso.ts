// Chiếu isometric: world (x,y) → screen. tileW=60, tileH=30 (tỉ lệ 2:1).
export const TILE_W = 60;
export const TILE_H = 30;
export let ORIGIN_X = 380;
export let ORIGIN_Y = 250;

export function setOrigin(x: number, y: number): void { ORIGIN_X = x; ORIGIN_Y = y; }

export function toScreen(x: number, y: number): { sx: number; sy: number } {
  return {
    sx: ORIGIN_X + (x - y) * (TILE_W / 2),
    sy: ORIGIN_Y + (x + y) * (TILE_H / 2),
  };
}

export function toWorld(sx: number, sy: number): { x: number; y: number } {
  const dx = (sx - ORIGIN_X) / (TILE_W / 2);
  const dy = (sy - ORIGIN_Y) / (TILE_H / 2);
  return { x: (dx + dy) / 2, y: (dy - dx) / 2 };
}

/** Điểm trên đường tròn thế giới sau chiếu iso (dùng vẽ vòng trận phát sáng). */
export function circlePoints(radius: number, steps = 64): Array<{ sx: number; sy: number }> {
  const pts: Array<{ sx: number; sy: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(toScreen(Math.cos(a) * radius, Math.sin(a) * radius));
  }
  return pts;
}
