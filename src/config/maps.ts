import { SPAWN_DISTANCE } from './balance';

// E2 — Định nghĩa bản đồ: hình học trận (số vòng/số ô/bán kính), số cổng spawn,
// số lớp HP của trung tâm và hệ số HP quái riêng của bản đồ.
export interface RingLayoutDef {
  radius: number;
  slots: number;
  name: string;
}

export interface MapDef {
  id: string;
  name: string;
  desc: string;
  rings: RingLayoutDef[];
  gates: number;
  waves: number;
  centerLayers: number;   // 1 = chỉ HP chính; 2 = thêm lớp khiên ngoài phải phá trước
  centerShieldHp: number; // HP của lớp khiên (chỉ dùng khi centerLayers = 2)
  enemyHpMul: number;     // hệ số độ khó riêng của bản đồ
}

export const MAPS: MapDef[] = [
  {
    id: 'map1',
    name: 'Bản đồ 1 — Sơn Môn',
    desc: 'Trận cơ bản: 2 vòng × 5 ô, 4 cổng, trung tâm 1 lớp HP.',
    rings: [
      { radius: 2.0, slots: 5, name: 'Vòng 1 (trong)' },
      { radius: 3.8, slots: 5, name: 'Vòng 2 (ngoài)' },
    ],
    gates: 4,
    waves: 8,
    centerLayers: 1,
    centerShieldHp: 0,
    enemyHpMul: 1,
  },
  {
    id: 'map2',
    name: 'Bản đồ 2 — Linh Khê Cốc',
    desc: 'Mở vòng 3 (6 ô), quái tràn vào từ 6 cổng, quái bền hơn 20%.',
    rings: [
      { radius: 2.0, slots: 5, name: 'Vòng 1 (trong)' },
      { radius: 3.8, slots: 5, name: 'Vòng 2 (ngoài)' },
      { radius: 5.4, slots: 6, name: 'Vòng 3' },
    ],
    gates: 6,
    waves: 8,
    centerLayers: 1,
    centerShieldHp: 0,
    enemyHpMul: 1.2,
  },
  {
    id: 'map3',
    name: 'Bản đồ 3 — Hắc Phong Lâm',
    desc: 'Mở vòng 4 (8 ô), trung tâm có 2 lớp HP (khiên 400 phải phá trước), quái bền hơn 20%.',
    rings: [
      { radius: 2.0, slots: 5, name: 'Vòng 1 (trong)' },
      { radius: 3.8, slots: 5, name: 'Vòng 2 (ngoài)' },
      { radius: 5.4, slots: 6, name: 'Vòng 3' },
      { radius: 6.9, slots: 8, name: 'Vòng 4' },
    ],
    gates: 6,
    waves: 8,
    centerLayers: 2,
    centerShieldHp: 400,
    enemyHpMul: 1.2,
  },
];

export function mapById(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

const GATE_NAMES_4 = ['Bắc', 'Đông', 'Nam', 'Tây'];
const GATE_NAMES_6 = ['Bắc', 'Đông Bắc', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây Bắc'];

/** Vị trí các cổng spawn quanh trận, cách đều nhau, bắt đầu từ hướng Bắc. */
export function gatesOf(map: MapDef): Array<{ x: number; y: number; name: string }> {
  const names = map.gates === 6 ? GATE_NAMES_6 : GATE_NAMES_4;
  return Array.from({ length: map.gates }, (_, i) => {
    const a = (i / map.gates) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * SPAWN_DISTANCE, y: Math.sin(a) * SPAWN_DISTANCE, name: names[i] ?? `Cổng ${i + 1}` };
  });
}
