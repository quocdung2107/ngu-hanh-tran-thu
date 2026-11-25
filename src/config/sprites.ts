// E5 — Kiến trúc render theo lớp + SpriteRegistry ("để mở" cho hình ảnh thật).
//
// Thứ tự lớp vẽ CỐ ĐỊNH (hằng số, có test khóa):
//   ground → groundFx → shadow → entity (sắp theo Y) → projectile → fx
// Mọi renderer của chế độ Dã Chiến phải tôn trọng thứ tự này.
//
// Mỗi thực thể chỉ khai báo spriteId. SpriteRegistry tra manifest:
//   - manifest có mục ảnh → renderer vẽ ảnh (neo + tỉ lệ theo mục ảnh), ảnh nạp
//     qua cache Image dùng chung.
//   - không có → vẽ hình khối placeholder theo màu hệ (shape fallback).
// Sau này muốn dùng hình thật: bỏ file ảnh vào dự án, thêm 1 dòng manifest ở
// SPRITE_MANIFEST (hoặc gọi registry.registerImage) — không sửa logic/renderer.

import { ELEMENT_COLORS, type Element } from './balance';

export const LAYERS = {
  ground: 0,
  groundFx: 1,
  shadow: 2,
  entity: 3,
  projectile: 4,
  fx: 5,
} as const;

export type LayerName = keyof typeof LAYERS;

/** Thứ tự lớp theo tên, từ dưới lên trên — đúng thứ tự trong LAYERS. */
export const LAYER_ORDER: LayerName[] = ['ground', 'groundFx', 'shadow', 'entity', 'projectile', 'fx'];

export type SpriteShape = 'hero' | 'blob' | 'gem' | 'orb' | 'tile';

export interface SpriteImageEntry {
  src: string;      // đường dẫn/URL của file ảnh
  anchorX: number;  // điểm neo ngang 0..1 (0.5 = giữa)
  anchorY: number;  // điểm neo dọc 0..1 (1 = neo chân — nhân vật/quái đứng trên đất)
  scale: number;    // tỉ lệ: chiều cao ảnh đích = scale × cỡ thế giới của thực thể × TILE_H
}

export interface SpriteDef {
  shape: SpriteShape;
  color: string;
  image?: SpriteImageEntry;
}

export type ResolvedSprite =
  | { kind: 'image'; id: string; entry: SpriteImageEntry; img: HTMLImageElement | null; def: SpriteDef }
  | { kind: 'shape'; id: string; def: SpriteDef };

const ELEMENT_LIST: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

function blob(color: string): SpriteDef {
  return { shape: 'blob', color };
}

/**
 * Manifest mặc định — CHỈ có shape fallback, chưa có file ảnh nào.
 * Muốn thêm ảnh thật cho một spriteId: thêm trường `image: { src, anchorX, anchorY, scale }`
 * vào mục tương ứng (xem hướng dẫn trong README, mục Dã Chiến).
 */
export const SPRITE_MANIFEST: Record<string, SpriteDef> = {
  hero: { shape: 'hero', color: '#e8f4ff' },
  'tile-ground': { shape: 'tile', color: '#16222f' },
  'pickup-lt': { shape: 'gem', color: '#7ee7f5' },
  'pickup-tinh': { shape: 'orb', color: '#ffffff' }, // màu thật lấy theo hệ khi vẽ
  boss: { shape: 'blob', color: '#ffd94a' },
};
for (const e of ELEMENT_LIST) {
  SPRITE_MANIFEST[`enemy-${e}`] = blob(ELEMENT_COLORS[e]);
  SPRITE_MANIFEST[`elite-${e}`] = blob(ELEMENT_COLORS[e]);
}

/** spriteId của quái theo hệ + loại (thường / tinh anh / boss). */
export function enemySpriteId(element: Element, kind: 'normal' | 'elite' | 'boss'): string {
  if (kind === 'boss') return 'boss';
  return `${kind === 'elite' ? 'elite' : 'enemy'}-${element}`;
}

export class SpriteRegistry {
  private manifest: Record<string, SpriteDef>;
  private imageCache = new Map<string, HTMLImageElement | null>();

  constructor(manifest: Record<string, SpriteDef> = SPRITE_MANIFEST) {
    // sao chép nông từng mục để registerImage không sửa manifest gốc dùng chung
    this.manifest = Object.fromEntries(Object.entries(manifest).map(([k, v]) => [k, { ...v }]));
  }

  /** Danh sách spriteId đang có trong manifest. */
  ids(): string[] {
    return Object.keys(this.manifest);
  }

  /** Gắn/thay mục ảnh cho một spriteId (đường dùng khi nạp manifest mở rộng hoặc test). */
  registerImage(id: string, entry: SpriteImageEntry): void {
    const def = this.manifest[id] ?? { shape: 'blob' as SpriteShape, color: '#ffffff' };
    this.manifest[id] = { ...def, image: entry };
  }

  /** Tra cứu spriteId: có mục ảnh → 'image' (kèm ảnh đã/đang nạp), không → 'shape' fallback. */
  resolve(id: string): ResolvedSprite {
    const def = this.manifest[id] ?? { shape: 'blob' as SpriteShape, color: '#cccccc' };
    if (def.image) {
      return { kind: 'image', id, entry: def.image, img: this.loadImage(def.image.src), def };
    }
    return { kind: 'shape', id, def };
  }

  /**
   * Nạp ảnh qua cache dùng chung. Môi trường không có DOM Image (test/headless)
   * thì trả null — renderer tự rơi về shape fallback cho tới khi ảnh sẵn sàng.
   */
  private loadImage(src: string): HTMLImageElement | null {
    const cached = this.imageCache.get(src);
    if (cached !== undefined) return cached;
    let img: HTMLImageElement | null = null;
    try {
      if (typeof Image !== 'undefined') {
        img = new Image();
        img.src = src;
      }
    } catch {
      img = null;
    }
    this.imageCache.set(src, img);
    return img;
  }
}

/** Registry dùng chung cho renderer. */
export const spriteRegistry = new SpriteRegistry();
