import { describe, expect, it } from 'vitest';
import { FIELD } from '../src/config/field';
import { LAYERS, LAYER_ORDER, SPRITE_MANIFEST, SpriteRegistry, spriteRegistry } from '../src/config/sprites';
import {
  aliveCount, cameraTarget, castFieldSkill, createFieldGame, isOutsideView,
  spawnPack, tickField, type FieldEnemy, type FieldState,
} from '../src/sim/field';

const noRand = () => 0.42;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function manualEnemy(s: FieldState, x: number, y: number, dmg = 6): FieldEnemy {
  const e: FieldEnemy = {
    id: s.nextEnemyId++, element: 'hoa', kind: 'normal', x, y,
    hp: FIELD.enemy.hp, maxHp: FIELD.enemy.hp, speed: FIELD.enemy.speed, dmg,
    size: FIELD.enemy.size, atkCd: 0, slowUntil: 0, slowPct: 0, rootUntil: 0, stunUntil: 0, alive: true,
  };
  s.enemies.push(e);
  return e;
}

describe('E5 — camera bám nhân vật', () => {
  it('đích camera kẹp ở góc bản đồ, camera lerp tới đích và không bao giờ ra ngoài biên', () => {
    const s = createFieldGame(noRand);
    s.hero.x = 1; s.hero.y = 1;
    expect(cameraTarget(s)).toEqual({ x: FIELD.viewW / 2, y: FIELD.viewH / 2 });
    const startX = s.camera.x;
    tickField(s, 0.05);
    expect(s.camera.x).toBeLessThan(startX); // đã nhích về phía đích
    expect(s.camera.x).toBeGreaterThan(cameraTarget(s).x); // nhưng chưa tới ngay (lerp mượt)
    for (let i = 0; i < 60; i++) {
      tickField(s, 0.05);
      expect(s.camera.x).toBeGreaterThanOrEqual(FIELD.viewW / 2);
      expect(s.camera.x).toBeLessThanOrEqual(FIELD.worldW - FIELD.viewW / 2);
      expect(s.camera.y).toBeGreaterThanOrEqual(FIELD.viewH / 2);
      expect(s.camera.y).toBeLessThanOrEqual(FIELD.worldH - FIELD.viewH / 2);
    }
    expect(s.camera.x).toBeCloseTo(FIELD.viewW / 2, 0);
    expect(s.camera.y).toBeCloseTo(FIELD.viewH / 2, 0);
  });

  it('nhân vật di chuyển bằng input và bằng click-to-move, kẹp trong bản đồ', () => {
    const s = createFieldGame(noRand);
    s.hero.input = { x: 1, y: 0 };
    tickField(s, 0.05);
    expect(s.hero.x).toBeGreaterThan(FIELD.worldW / 2);
    s.hero.input = { x: 0, y: 0 };
    const x0 = s.hero.x;
    s.hero.moveTarget = { x: x0 - 5, y: s.hero.y };
    tickField(s, 0.05);
    expect(s.hero.x).toBeLessThan(x0);
    s.hero.moveTarget = null;
    s.hero.x = 0.1;
    s.hero.input = { x: -1, y: 0 };
    tickField(s, 0.05);
    expect(s.hero.x).toBeGreaterThanOrEqual(FIELD.hero.size / 2);
  });
});

describe('E5 — spawn bầy quái', () => {
  it('quái spawn ngoài khung hình, trong bản đồ, và không vượt trần sống', () => {
    const s = createFieldGame(mulberry32(7));
    for (let i = 0; i < 5; i++) spawnPack(s);
    expect(s.enemies.length).toBeGreaterThan(0);
    for (const e of s.enemies) {
      expect(isOutsideView(s, e.x, e.y)).toBe(true);
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.x).toBeLessThanOrEqual(FIELD.worldW);
      expect(e.y).toBeGreaterThanOrEqual(0);
      expect(e.y).toBeLessThanOrEqual(FIELD.worldH);
    }
    for (let i = 0; i < 80; i++) spawnPack(s);
    expect(aliveCount(s)).toBeLessThanOrEqual(FIELD.maxAlive);
    expect(aliveCount(s)).toBe(FIELD.maxAlive); // đủ số lần thả thì chạm đúng trần
  });

  it('quái thường cùng cỡ nhân vật; tinh anh 1.4, boss 1.8 (theo config)', () => {
    expect(FIELD.enemy.size).toBe(FIELD.hero.size);
    expect(FIELD.elite.size).toBe(1.4);
    expect(FIELD.boss.size).toBe(1.8);
  });
});

describe('E5 — vật phẩm rơi & hút', () => {
  it('vật phẩm trong tầm hút sẽ bay về phía nhân vật', () => {
    const s = createFieldGame(noRand);
    s.pickups.push({
      id: s.nextPickupId++, kind: 'tinh', element: 'hoa', amount: 3,
      x: s.hero.x + 2.3, y: s.hero.y, magnet: false, bornAt: 0,
    });
    const before = Math.hypot(s.pickups[0].x - s.hero.x, s.pickups[0].y - s.hero.y);
    tickField(s, 0.05);
    expect(s.pickups[0].magnet).toBe(true);
    const after = Math.hypot(s.pickups[0].x - s.hero.x, s.pickups[0].y - s.hero.y);
    expect(after).toBeLessThan(before);
  });

  it('nhặt vật phẩm cộng đúng Linh Thạch và tinh đúng hệ', () => {
    const s = createFieldGame(noRand);
    s.pickups.push({
      id: s.nextPickupId++, kind: 'tinh', element: 'hoa', amount: 3,
      x: s.hero.x + 1.0, y: s.hero.y, magnet: false, bornAt: 0,
    });
    s.pickups.push({
      id: s.nextPickupId++, kind: 'lt', element: 'hoa', amount: 7,
      x: s.hero.x - 1.0, y: s.hero.y, magnet: false, bornAt: 0,
    });
    for (let i = 0; i < 20; i++) tickField(s, 0.05);
    expect(s.stats.tinh.hoa).toBe(3);
    expect(s.stats.tinh.kim).toBe(0);
    expect(s.stats.linhThach).toBe(7);
    expect(s.pickups.length).toBe(0);
  });

  it('giết quái rơi vật phẩm mang hệ của quái', () => {
    const s = createFieldGame(noRand);
    const e = manualEnemy(s, s.hero.x + 2, s.hero.y);
    e.hp = 1; // loạt đạn đầu tiên kết liễu
    for (let i = 0; i < 30 && s.stats.kills === 0; i++) tickField(s, 0.05);
    expect(s.stats.kills).toBe(1);
    const tinhPickup = s.pickups.find((p) => p.kind === 'tinh');
    expect(tinhPickup?.element).toBe(e.element);
    expect(s.pickups.some((p) => p.kind === 'lt')).toBe(true);
  });
});

describe('E5 — thắng / thua', () => {
  it('sống sót đủ 300 giây thì thắng', () => {
    const s = createFieldGame(noRand);
    s.elapsed = FIELD.survivalTime - 0.1;
    tickField(s, 0.2);
    expect(s.phase).toBe('won');
  });

  it('nhân vật bị quái vây đánh tới HP 0 thì thua', () => {
    const s = createFieldGame(noRand);
    s.hero.hp = 10;
    manualEnemy(s, s.hero.x + 0.5, s.hero.y, 100);
    tickField(s, 0.05);
    expect(s.hero.hp).toBe(0);
    expect(s.phase).toBe('lost');
  });
});

describe('E5 — kỹ năng chủ động', () => {
  it('Ngũ Hành Bạo gây sát thương diện quanh thân, trừ mana và chạy cooldown', () => {
    const s = createFieldGame(noRand);
    const e = manualEnemy(s, s.hero.x + 1.5, s.hero.y);
    const far = manualEnemy(s, s.hero.x + 20, s.hero.y);
    expect(castFieldSkill(s, 'nguHanhBao')).toBe(true);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(far.hp).toBe(far.maxHp);
    expect(s.hero.mana).toBe(FIELD.hero.manaStart - 35);
    expect(castFieldSkill(s, 'nguHanhBao')).toBe(false); // đang cooldown
  });

  it('Hồi Sinh Thuật hồi HP nhưng không vượt tối đa', () => {
    const s = createFieldGame(noRand);
    s.hero.hp = s.hero.maxHp - 10;
    expect(castFieldSkill(s, 'hoiSinhThuat')).toBe(true);
    expect(s.hero.hp).toBe(s.hero.maxHp);
  });
});

describe('E5 — nhân vật mẫu (kiting) sống qua 60 giây mô phỏng', () => {
  it('tự chạy né bầy quái, diệt được quái và còn sống sau 60s', () => {
    const s = createFieldGame(mulberry32(12345));
    const dt = 1 / 20;
    for (let i = 0; i < 61 * 20; i++) {
      // AI mẫu: chạy xa khỏi quái gần (trọng số nghịch đảo khoảng cách), tránh biên
      let fx = 0, fy = 0, near = 0;
      for (const e of s.enemies) {
        const dx = s.hero.x - e.x, dy = s.hero.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 5 && d > 0.001) { fx += (dx / d) / d; fy += (dy / d) / d; near++; }
      }
      if (s.hero.x < 9) fx += 1.5; if (s.hero.x > FIELD.worldW - 9) fx -= 1.5;
      if (s.hero.y < 9) fy += 1.5; if (s.hero.y > FIELD.worldH - 9) fy -= 1.5;
      if (near === 0) { // không bị vây: tiến về vật phẩm gần nhất hoặc về giữa
        let bx = FIELD.worldW / 2, by = FIELD.worldH / 2, bd = 10;
        for (const p of s.pickups) {
          const d = Math.hypot(p.x - s.hero.x, p.y - s.hero.y);
          if (d < bd) { bd = d; bx = p.x; by = p.y; }
        }
        fx = bx - s.hero.x; fy = by - s.hero.y;
        if (Math.hypot(fx, fy) < 1) { fx = 0; fy = 0; }
      }
      s.hero.input = { x: fx, y: fy };
      if (s.hero.hp < s.hero.maxHp * 0.45) castFieldSkill(s, 'hoiSinhThuat');
      const around = s.enemies.filter((e) => Math.hypot(e.x - s.hero.x, e.y - s.hero.y) <= 3.0).length;
      if (around >= 3) castFieldSkill(s, 'nguHanhBao');
      tickField(s, dt);
      if (s.phase !== 'running') break;
    }
    expect(s.elapsed).toBeGreaterThanOrEqual(60);
    expect(s.phase).toBe('running');
    expect(s.hero.hp).toBeGreaterThan(0);
    expect(s.stats.kills).toBeGreaterThan(0);
  });
});

describe('E5 — thứ tự lớp vẽ & SpriteRegistry', () => {
  it('thứ tự lớp cố định: ground → groundFx → shadow → entity → projectile → fx', () => {
    expect(LAYER_ORDER).toEqual(['ground', 'groundFx', 'shadow', 'entity', 'projectile', 'fx']);
    const vals = LAYER_ORDER.map((n) => LAYERS[n]);
    expect(vals).toEqual([...vals].sort((a, b) => a - b));
    expect(new Set(vals).size).toBe(vals.length);
  });

  it('mọi spriteId trong manifest mặc định đều rơi về shape fallback', () => {
    expect(spriteRegistry.ids().length).toBeGreaterThanOrEqual(13); // hero, tile, 2 pickup, boss, 5 enemy-*, 5 elite-*
    for (const id of spriteRegistry.ids()) {
      expect(spriteRegistry.resolve(id).kind).toBe('shape');
    }
    expect(spriteRegistry.resolve('khong-ton-tai').kind).toBe('shape');
  });

  it('khi manifest có mục ảnh, resolve trả về mục ảnh đó', () => {
    const reg = new SpriteRegistry(SPRITE_MANIFEST);
    reg.registerImage('hero', { src: 'assets/sprites/hero.png', anchorX: 0.5, anchorY: 1, scale: 1 });
    const r = reg.resolve('hero');
    expect(r.kind).toBe('image');
    if (r.kind === 'image') {
      expect(r.entry.src).toBe('assets/sprites/hero.png');
      expect(r.entry.anchorY).toBe(1);
    }
    // registry dùng chung không bị ảnh hưởng
    expect(spriteRegistry.resolve('hero').kind).toBe('shape');
  });
});
