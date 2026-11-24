import type { Element } from './balance';

// E3 — Cây Đạo Ngộ: 12 nút mua bằng điểm Đạo Ngộ (kiếm từ thắng bản đồ).
// Không có nút tiên quyết — mua tự do khi đủ điểm. Hiệu ứng áp vào ván mới
// qua RunModifiers (xem src/sim/daongo.ts).
export interface DaoNgoEffect {
  startLt?: number;                          // +Linh Thạch đầu ván
  startTinhPerElement?: number;              // +tinh mỗi hệ đầu ván
  priceDiscountElement?: Element;            // giảm giá trụ của hệ này
  priceDiscountPct?: number;                 // mức giảm (0.2 = 20%)
  centerHpBonus?: number;                    // +HP tối đa trung tâm
  extraLinhMach?: number;                    // +số ô Linh Mạch mỗi đợt
  heroMaxHpBonus?: number;                   // +HP tối đa nhân vật
  ultCdMul?: number;                         // hệ số hồi chiêu tuyệt kỹ (<1 = nhanh hơn)
}

export interface DaoNgoNode {
  id: string;
  name: string;
  cost: number; // điểm Đạo Ngộ
  desc: string;
  effect: DaoNgoEffect;
}

export const DAO_NGO_NODES: DaoNgoNode[] = [
  { id: 'khai-mon', name: 'Khai Môn Linh Thạch', cost: 1, desc: '+100 Linh Thạch khi bắt đầu mỗi ván.', effect: { startLt: 100 } },
  { id: 'tu-linh', name: 'Tụ Linh Tán', cost: 1, desc: '+5 tinh mỗi hệ khi bắt đầu mỗi ván.', effect: { startTinhPerElement: 5 } },
  { id: 'kim-hue', name: 'Kim Hệ Linh Huệ', cost: 1, desc: 'Giảm 20% giá xây/nâng trụ Kim.', effect: { priceDiscountElement: 'kim', priceDiscountPct: 0.2 } },
  { id: 'moc-hue', name: 'Mộc Hệ Linh Huệ', cost: 1, desc: 'Giảm 20% giá xây/nâng trụ Mộc.', effect: { priceDiscountElement: 'moc', priceDiscountPct: 0.2 } },
  { id: 'thuy-hue', name: 'Thủy Hệ Linh Huệ', cost: 1, desc: 'Giảm 20% giá xây/nâng trụ Thủy.', effect: { priceDiscountElement: 'thuy', priceDiscountPct: 0.2 } },
  { id: 'hoa-hue', name: 'Hỏa Hệ Linh Huệ', cost: 1, desc: 'Giảm 20% giá xây/nâng trụ Hỏa.', effect: { priceDiscountElement: 'hoa', priceDiscountPct: 0.2 } },
  { id: 'tho-hue', name: 'Thổ Hệ Linh Huệ', cost: 1, desc: 'Giảm 20% giá xây/nâng trụ Thổ.', effect: { priceDiscountElement: 'tho', priceDiscountPct: 0.2 } },
  { id: 'tam-cang', name: 'Tâm Cang Cố Trận', cost: 2, desc: '+100 HP tối đa cho trung tâm trận pháp.', effect: { centerHpBonus: 100 } },
  { id: 'linh-mach-phu', name: 'Linh Mạch Phù', cost: 2, desc: 'Mỗi đợt có thêm 1 ô Linh Mạch.', effect: { extraLinhMach: 1 } },
  { id: 'than-hanh', name: 'Thân Hành Cường Hóa', cost: 2, desc: 'Nhân vật +40 HP tối đa.', effect: { heroMaxHpBonus: 40 } },
  { id: 'gia-cat', name: 'Gia Cát Tụ Bảo', cost: 2, desc: '+200 Linh Thạch khi bắt đầu mỗi ván.', effect: { startLt: 200 } },
  { id: 'dai-dao', name: 'Đại Đạo Vô Hình', cost: 3, desc: 'Tuyệt kỹ các vòng hồi chiêu nhanh hơn 15%.', effect: { ultCdMul: 0.85 } },
];

export function daoNgoNode(id: string): DaoNgoNode | undefined {
  return DAO_NGO_NODES.find((n) => n.id === id);
}

// Điểm Đạo Ngộ thưởng khi thắng bản đồ.
export const DAO_NGO_POINTS_FIRST_WIN = 2;
export const DAO_NGO_POINTS_REPEAT_WIN = 1;
