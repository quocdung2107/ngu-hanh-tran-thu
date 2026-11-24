import { MAPS } from './config/maps';
import { DAO_NGO_POINTS_FIRST_WIN, DAO_NGO_POINTS_REPEAT_WIN, daoNgoNode } from './config/daongo';

// E2/E3 — Lưu trữ cục bộ (localStorage): tiến độ chiến dịch, trận hình mẫu,
// điểm & cây Đạo Ngộ, kỷ lục Vô Tận, cài đặt. Mọi truy cập localStorage của
// game đều qua module này. Các hàm biến đổi tiến độ là hàm thuần trên object
// để test được không cần trình duyệt.
export interface GameSettings {
  clickToMove: boolean; // E3: click để ra lệnh di chuyển cho nhân vật (mặc định tắt)
  muted: boolean;       // E4: tắt âm thanh
  volume: number;       // E4: âm lượng 0..1
}

export interface CampaignProgress {
  unlocked: string[];                       // id các bản đồ đã mở
  highestWave: Record<string, number>;      // đợt cao nhất đạt được theo bản đồ
  presets: Record<string, string>;          // mã trận hình theo bản đồ
  daoNgoPoints: number;                     // E3: điểm Đạo Ngộ chưa tiêu
  ownedNodes: string[];                     // E3: id nút Đạo Ngộ đã mua
  endlessBest: Record<string, number>;      // E3: đợt Vô Tận cao nhất theo bản đồ
  settings: GameSettings;
}

const STORAGE_KEY = 'ngu-hanh-tran-thu-progress-v1';

export function defaultProgress(): CampaignProgress {
  return {
    unlocked: [MAPS[0].id], highestWave: {}, presets: {},
    daoNgoPoints: 0, ownedNodes: [], endlessBest: {},
    settings: { clickToMove: false, muted: false, volume: 0.7 },
  };
}

/** Thuần: ghi nhận đợt đã đạt (chỉ tăng, không giảm). */
export function recordWaveReached(p: CampaignProgress, mapId: string, wave: number): CampaignProgress {
  if ((p.highestWave[mapId] ?? 0) >= wave) return p;
  return { ...p, highestWave: { ...p.highestWave, [mapId]: wave } };
}

/** Thuần: thắng một bản đồ → mở bản đồ kế tiếp + thưởng điểm Đạo Ngộ (lần đầu 2 điểm, thắng lại 1 điểm). */
export function recordMapWin(p: CampaignProgress, mapId: string): CampaignProgress {
  const idx = MAPS.findIndex((m) => m.id === mapId);
  const waves = MAPS[idx]?.waves ?? 0;
  const firstWin = (p.highestWave[mapId] ?? 0) < waves;
  let next = recordWaveReached(p, mapId, waves);
  next = {
    ...next,
    daoNgoPoints: next.daoNgoPoints + (firstWin ? DAO_NGO_POINTS_FIRST_WIN : DAO_NGO_POINTS_REPEAT_WIN),
  };
  const nextMap = MAPS[idx + 1];
  if (nextMap && !next.unlocked.includes(nextMap.id)) {
    next = { ...next, unlocked: [...next.unlocked, nextMap.id] };
  }
  return next;
}

/** Thuần: ghi kỷ lục Vô Tận (chỉ tăng). */
export function recordEndlessWave(p: CampaignProgress, mapId: string, wave: number): CampaignProgress {
  if ((p.endlessBest[mapId] ?? 0) >= wave) return p;
  return { ...p, endlessBest: { ...p.endlessBest, [mapId]: wave } };
}

/** Thuần: mua một nút Đạo Ngộ — kiểm tra tồn tại, chưa sở hữu, đủ điểm. */
export function buyNode(p: CampaignProgress, nodeId: string): { ok: boolean; reason?: string; progress: CampaignProgress } {
  const node = daoNgoNode(nodeId);
  if (!node) return { ok: false, reason: 'Nút không tồn tại.', progress: p };
  if (p.ownedNodes.includes(nodeId)) return { ok: false, reason: 'Đã sở hữu nút này.', progress: p };
  if (p.daoNgoPoints < node.cost) return { ok: false, reason: 'Không đủ điểm Đạo Ngộ.', progress: p };
  return {
    ok: true,
    progress: { ...p, daoNgoPoints: p.daoNgoPoints - node.cost, ownedNodes: [...p.ownedNodes, nodeId] },
  };
}

/** Thuần: lưu mã trận hình cho một bản đồ. */
export function savePreset(p: CampaignProgress, mapId: string, code: string): CampaignProgress {
  return { ...p, presets: { ...p.presets, [mapId]: code } };
}

export function loadProgress(): CampaignProgress {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<CampaignProgress>;
    const d = defaultProgress();
    return {
      unlocked: Array.isArray(parsed.unlocked) && parsed.unlocked.length ? parsed.unlocked : d.unlocked,
      highestWave: parsed.highestWave ?? {},
      presets: parsed.presets ?? {},
      daoNgoPoints: parsed.daoNgoPoints ?? 0,
      ownedNodes: parsed.ownedNodes ?? [],
      endlessBest: parsed.endlessBest ?? {},
      settings: { ...d.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return defaultProgress();
  }
}

export function storeProgress(p: CampaignProgress): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* môi trường không có localStorage (test) — bỏ qua */ }
}
