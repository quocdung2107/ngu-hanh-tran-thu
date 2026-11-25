import { describe, expect, it } from 'vitest';
import { CENTER_ATTACK_RANGE, DEFENSE_CAM_MARGIN, ELEMENTS } from '../src/config/balance';
import { MAPS, gatesOf, mapById } from '../src/config/maps';
import { SPRITE_MANIFEST, spriteRegistry, towerSpriteId } from '../src/config/sprites';
import { setOriginForCamera, toScreen, toWorld } from '../src/render/iso';
import { defenseCameraBounds, defenseCameraTarget, updateDefenseCamera } from '../src/sim/camera';
import { tick } from '../src/sim/combat';
import { spawnEnemy, updateEnemies } from '../src/sim/enemies';
import { returnHeroToCenter } from '../src/sim/hero';
import { createGame, slotPos } from '../src/sim/state';
import { startWave } from '../src/sim/waves';

const noRand = () => 0.42;

describe('E6 — bản đồ lớn và cổng spawn ở biên', () => {
  it('mỗi bản đồ có worldSize 60/70/80 và mọi cổng nằm sát biên (cách tâm ≥ worldSize/2 − 1)', () => {
    expect(MAPS.map((m) => m.worldSize)).toEqual([60, 70, 80]);
    for (const m of MAPS) {
      const gates = gatesOf(m);
      expect(gates.length).toBe(m.gates);
      for (const g of gates) {
        const d = Math.hypot(g.x, g.y);
        expect(d).toBeGreaterThanOrEqual(m.worldSize / 2 - 1);
        expect(d).toBeLessThanOrEqual(m.worldSize / 2);
      }
    }
    expect(gatesOf(mapById('map1')).length).toBe(4);
    expect(gatesOf(mapById('map2')).length).toBe(6);
    expect(gatesOf(mapById('map3')).length).toBe(6);
  });

  it('quái spawn ở cổng biên: con đầu tiên của đợt cách tâm ≥ 25 đơn vị (map 1)', () => {
    const s = createGame(noRand, mapById('map1'));
    startWave(s);
    for (let i = 0; i < 10 && s.enemies.length === 0; i++) tick(s, 1 / 20);
    expect(s.enemies.length).toBeGreaterThan(0);
    expect(Math.hypot(s.enemies[0].x, s.enemies[0].y)).toBeGreaterThanOrEqual(25);
  });

  it('quái hành quân từ biên tới được vùng tâm và đánh trung tâm', () => {
    const s = createGame(noRand, mapById('map1'));
    s.phase = 'combat';
    s.hero.x = 29; s.hero.y = 29; // nhân vật đứng xa góc bản đồ, không cản đường quái
    spawnEnemy(s, 'thuong');
    const e = s.enemies[0];
    expect(Math.hypot(e.x, e.y)).toBeGreaterThanOrEqual(25);
    let ticks = 0;
    while (Math.hypot(e.x, e.y) > CENTER_ATTACK_RANGE + 0.01 && ticks < 4000) {
      updateEnemies(s, 1 / 20);
      ticks++;
    }
    expect(Math.hypot(e.x, e.y)).toBeLessThanOrEqual(CENTER_ATTACK_RANGE + 0.01);
    const hp0 = s.center.hp;
    for (let i = 0; i < 40; i++) updateEnemies(s, 1 / 20);
    expect(s.center.hp).toBeLessThan(hp0); // đã đứng đánh trung tâm
  });
});

describe('E6 — camera thủ trận bám nhân vật', () => {
  it('đích camera bị kẹp ở cả 4 góc bản đồ; camera hội tụ về đích và khung hình không lộ ra ngoài bản đồ', () => {
    const half = 60 / 2;
    const bound = half - DEFENSE_CAM_MARGIN;
    for (const [hx, hy] of [[-29.5, -29.5], [29.5, -29.5], [-29.5, 29.5], [29.5, 29.5]] as const) {
      const s = createGame(noRand, mapById('map1'));
      s.hero.x = hx; s.hero.y = hy;
      const target = defenseCameraTarget(s);
      expect(Math.abs(target.x)).toBeLessThanOrEqual(bound + 1e-9);
      expect(Math.abs(target.y)).toBeLessThanOrEqual(bound + 1e-9);
      expect(Math.sign(target.x)).toBe(Math.sign(hx));
      expect(Math.sign(target.y)).toBe(Math.sign(hy));
      for (let i = 0; i < 200; i++) updateDefenseCamera(s, 1 / 20);
      expect(s.camera.x).toBeCloseTo(target.x, 1);
      expect(s.camera.y).toBeCloseTo(target.y, 1);
      // mọi điểm trong khung hình (camera ± lề) vẫn nằm trong bản đồ
      expect(Math.abs(s.camera.x) + DEFENSE_CAM_MARGIN).toBeLessThanOrEqual(half + 1e-6);
      expect(Math.abs(s.camera.y) + DEFENSE_CAM_MARGIN).toBeLessThanOrEqual(half + 1e-6);
    }
  });

  it('camera đi theo khi nhân vật chạy xa khỏi tâm (tick ở giai đoạn xây cũng cập nhật camera)', () => {
    const s = createGame(noRand, mapById('map1'));
    s.heroInput = { x: 1, y: 0 };
    for (let i = 0; i < 20 * 5; i++) tick(s, 1 / 20);
    expect(s.hero.x).toBeGreaterThan(6); // đã ra khỏi "bán kính hoạt động" cũ
    expect(s.camera.x).toBeGreaterThan(6); // camera bám theo
    const b = defenseCameraBounds(60);
    expect(s.camera.x).toBeLessThanOrEqual(b.maxX + 1e-9);
  });
});

describe('E6 — nhân vật đi tự do toàn bản đồ', () => {
  it('đi bằng phím ở giai đoạn xây: vượt bán kính 6 cũ, bị kẹp ở biên bản đồ', () => {
    const s = createGame(noRand, mapById('map1'));
    expect(s.phase).toBe('build');
    s.heroInput = { x: 1, y: 0 };
    for (let i = 0; i < 20 * 20; i++) tick(s, 1 / 20);
    expect(s.hero.x).toBeGreaterThan(6);
    expect(s.hero.x).toBeLessThanOrEqual(29.5 + 1e-9);
    expect(s.hero.x).toBeCloseTo(29.5, 0); // chạy hết cỡ thì dừng ở biên
  });

  it('phím T (returnHeroToCenter): nhân vật về tâm trận và camera nhảy theo ngay', () => {
    const s = createGame(noRand, mapById('map2'));
    s.hero.x = 25; s.hero.y = -20;
    s.heroMoveTarget = { x: -30, y: 30 };
    s.camera.x = -14; s.camera.y = 14;
    returnHeroToCenter(s);
    expect(s.hero.x).toBeCloseTo(0.9);
    expect(s.hero.y).toBeCloseTo(0);
    expect(s.heroMoveTarget).toBeNull();
    const t = defenseCameraTarget(s);
    expect(s.camera.x).toBeCloseTo(t.x);
    expect(s.camera.y).toBeCloseTo(t.y);
  });
});

describe('E6 — chọn ô trụ qua phép biến đổi camera', () => {
  it('camera lệch khỏi tâm: screen→world trả đúng ô trụ dưới điểm bấm (mọi ô, cả 3 bản đồ)', () => {
    for (const map of MAPS) {
      const s = createGame(noRand, map);
      // camera lệch hẳn về một góc (như khi nhân vật chạy ra biên)
      const cam = { x: map.worldSize / 2 - DEFENSE_CAM_MARGIN, y: -(map.worldSize / 2 - DEFENSE_CAM_MARGIN) };
      setOriginForCamera(760, 560, cam.x, cam.y);
      for (let i = 0; i < s.towers.length; i++) {
        const pos = slotPos(s.layout, i);
        const scr = toScreen(pos.x, pos.y);
        const w = toWorld(scr.sx, scr.sy);
        expect(Math.hypot(w.x - pos.x, w.y - pos.y)).toBeLessThan(1e-6);
        // cùng thuật toán picking như main.ts: ô gần điểm thế giới nhất trong 0.65
        let best = -1; let bestD = 0.65;
        for (let j = 0; j < s.towers.length; j++) {
          const p = slotPos(s.layout, j);
          const d = Math.hypot(p.x - w.x, p.y - w.y);
          if (d < bestD) { bestD = d; best = j; }
        }
        expect(best).toBe(i);
      }
    }
  });
});

describe('E6 — spriteId cho trụ và trung tâm', () => {
  it('manifest có tower-<hệ> cho đủ 5 hệ + center, tất cả resolve về shape fallback', () => {
    for (const e of ELEMENTS) {
      const id = towerSpriteId(e);
      expect(SPRITE_MANIFEST[id]).toBeDefined();
      expect(spriteRegistry.resolve(id).kind).toBe('shape');
    }
    expect(SPRITE_MANIFEST['center']).toBeDefined();
    expect(spriteRegistry.resolve('center').kind).toBe('shape');
  });
});
