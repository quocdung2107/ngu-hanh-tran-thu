// E5 — Dã Chiến: MỌI hằng số của chế độ dã chiến nằm ở đây (không hardcode trong sim/render).
// Bản đồ lớn, camera bám nhân vật, quái cùng cỡ nhân vật kéo tới thành bầy.

export const FIELD = {
  worldW: 80,           // bản đồ 80×80 đơn vị thế giới
  worldH: 80,
  viewW: 18,            // khung nhìn ~18×13 đơn vị thế giới
  viewH: 13,
  cameraLerp: 6,        // tốc độ bám camera (hệ số lerp theo giây)
  survivalTime: 300,    // sống sót 5 phút = thắng
  tileSize: 4,          // cỡ ô nền khi vẽ lớp ground (đơn vị thế giới)
  maxAlive: 120,        // trần quái sống cùng lúc (giữ FPS)

  hero: {
    size: 0.9,          // quái thường CÙNG cỡ này (yêu cầu của thiết kế E5)
    hp: 260,
    dmg: 15,
    range: 6.5,               // tầm tự động tấn công
    atkPerSec: 1.4,           // nhịp loạt đạn
    projectilesPerVolley: 5,  // số tia đạn mỗi loạt (tỏa vào bầy quái như ảnh tham chiếu)
    projectileSpeed: 15,
    speed: 3.4,
    armor: 3,
    regenPerSec: 0.8,
    critChance: 0.1,
    critMul: 2,
    manaMax: 100,
    manaStart: 100,
    manaRegenPerSec: 5,
  },

  enemy: {
    size: 0.9,
    hp: 42,
    speed: 1.55,
    speedVariance: 0.3,   // tốc độ từng con = speed × (1 − variance/2 … 1 + variance/2)
    dmg: 6,
    atkPerSec: 1.0,       // nhịp đánh khi chạm nhân vật
    attackGap: 0.35,      // khoảng hở cộng thêm ngoài bán kính hai thân để bắt đầu đánh
    rewardLinhThach: 6,
    rewardTinh: 2,        // tinh đúng hệ của quái
  },

  elite: {
    size: 1.4,
    hpMul: 6,
    dmgMul: 1.6,
    speedMul: 0.95,
    rewardMul: 5,
    chance: 0.05,         // tỉ lệ mỗi con quái thường thành tinh anh (chỉ sau eliteFromSec)
    fromSec: 45,
  },

  boss: {
    size: 1.8,
    hpMul: 30,
    dmgMul: 2.5,
    speedMul: 0.8,
    rewardLinhThach: 80,
    rewardTinh: 15,
    atSec: 240,           // boss dã chiến xuất hiện ở phút thứ 4 (một lần)
  },

  spawn: {
    baseInterval: 1.6,    // giây giữa hai lần thả bầy ở đầu ván
    minInterval: 0.45,
    intervalStepPerTier: 0.13, // mỗi mốc 30s, nhịp thả nhanh hơn bấy nhiêu giây
    tierSec: 30,
    packBase: 3,          // số quái mỗi bầy ở đầu ván
    packPerTier: 1,       // mỗi mốc 30s bầy đông thêm 1
    packMax: 8,
    margin: 2.5,          // spawn ngoài khung hình thêm bấy nhiêu đơn vị
  },

  pickup: {
    magnetRadius: 2.4,    // nhân vật tới gần bấy nhiêu thì vật phẩm hút về
    collectRadius: 0.6,   // chạm khoảng này thì nhặt được
    magnetSpeed: 9,
    scatter: 0.55,        // độ văng ra quanh xác quái khi rơi
  },
} as const;

/** Nhịp thả bầy (giây) tại thời điểm `elapsed` — nhanh dần theo mốc 30s, không dưới minInterval. */
export function spawnIntervalAt(elapsed: number): number {
  const tier = Math.floor(elapsed / FIELD.spawn.tierSec);
  return Math.max(FIELD.spawn.minInterval, FIELD.spawn.baseInterval - tier * FIELD.spawn.intervalStepPerTier);
}

/** Số quái mỗi bầy tại thời điểm `elapsed`. */
export function packSizeAt(elapsed: number): number {
  const tier = Math.floor(elapsed / FIELD.spawn.tierSec);
  return Math.min(FIELD.spawn.packMax, FIELD.spawn.packBase + tier * FIELD.spawn.packPerTier);
}

/** Bán kính spawn quanh nhân vật: đủ xa để điểm spawn luôn nằm ngoài khung nhìn. */
export function spawnDistance(): number {
  const halfDiag = Math.hypot(FIELD.viewW / 2, FIELD.viewH / 2);
  return halfDiag + FIELD.spawn.margin;
}

// ===== Kỹ năng chủ động của nhân vật trong Dã Chiến (phím 1/2/3) =====
export type FieldSkillKind = 'blast' | 'swordRain' | 'heal';

export interface FieldSkillDef {
  id: string;
  name: string;
  key: string; // phím tắt hiển thị
  manaCost: number;
  cooldown: number;
  kind: FieldSkillKind;
  power: number;  // blast/swordRain: sát thương | heal: HP hồi
  radius: number; // blast/swordRain
  desc: string;
}

export const FIELD_SKILLS: FieldSkillDef[] = [
  {
    id: 'nguHanhBao', name: 'Ngũ Hành Bạo', key: '1', manaCost: 35, cooldown: 10,
    kind: 'blast', power: 70, radius: 3.2,
    desc: 'Nổ diện quanh thân, 70 sát thương cho mọi quái trong 3.2 đơn vị.',
  },
  {
    id: 'vanKiemVu', name: 'Vạn Kiếm Vũ', key: '2', manaCost: 45, cooldown: 16,
    kind: 'swordRain', power: 90, radius: 3.0,
    desc: 'Mưa kiếm giáng xuống cụm quái đông nhất gần nhân vật, 90 sát thương.',
  },
  {
    id: 'hoiSinhThuat', name: 'Hồi Sinh Thuật', key: '3', manaCost: 40, cooldown: 22,
    kind: 'heal', power: 90, radius: 0,
    desc: 'Hồi ngay 90 HP cho nhân vật.',
  },
];

export const FIELD_SKILL_BY_ID: Record<string, FieldSkillDef> = Object.fromEntries(
  FIELD_SKILLS.map((s) => [s.id, s]),
);
