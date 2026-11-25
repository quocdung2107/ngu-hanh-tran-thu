import { MAPS } from '../config/maps';
import { DAO_NGO_NODES } from '../config/daongo';
import type { CampaignProgress } from '../persistence';

export interface MenuCallbacks {
  onStart: (mapId: string, endless: boolean) => void;
  onStartField: () => void; // E5: vào chế độ Dã Chiến
  onBuyNode: (nodeId: string) => void;
  onToggleClickToMove: (enabled: boolean) => void;
}

// E2/E3 — Màn hình chọn bản đồ + cây Đạo Ngộ + cài đặt (DOM đơn giản).
export class Menu {
  private el: HTMLElement;
  private cb: MenuCallbacks;

  constructor(cb: MenuCallbacks) {
    this.el = document.getElementById('menu')!;
    this.cb = cb;
    document.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      const start = target.closest('[data-start-map]') as HTMLElement | null;
      if (start && !start.hasAttribute('disabled')) { this.cb.onStart(start.dataset.startMap!, false); return; }
      if (target.closest('[data-start-field]')) { this.cb.onStartField(); return; }
      const endless = target.closest('[data-start-endless]') as HTMLElement | null;
      if (endless && !endless.hasAttribute('disabled')) { this.cb.onStart(endless.dataset.startEndless!, true); return; }
      const buy = target.closest('[data-buy-node]') as HTMLElement | null;
      if (buy && !buy.hasAttribute('disabled')) { this.cb.onBuyNode(buy.dataset.buyNode!); return; }
    });
    document.addEventListener('change', (ev) => {
      const target = ev.target as HTMLInputElement;
      if (target.id === 'setting-click-to-move') this.cb.onToggleClickToMove(target.checked);
    });
  }

  show(progress: CampaignProgress): void {
    this.el.classList.remove('hidden');
    const cards = MAPS.map((m) => {
      const unlocked = progress.unlocked.includes(m.id);
      const best = progress.highestWave[m.id] ?? 0;
      const done = best >= m.waves;
      const endlessBest = progress.endlessBest[m.id] ?? 0;
      return `
        <div class="map-card ${unlocked ? '' : 'locked'}">
          <h3>${unlocked ? (done ? '🏆' : '🗺') : '🔒'} ${m.name}</h3>
          <p>${m.desc}</p>
          <p class="dim">${m.rings.length} vòng · ${m.rings.reduce((s, r) => s + r.slots, 0)} ô trụ · ${m.gates} cổng · ${m.waves} đợt</p>
          <p>${unlocked ? (done ? 'Đã thắng bản đồ này.' : best > 0 ? `Đợt cao nhất đã đạt: <b>${best}/${m.waves}</b>` : 'Chưa chơi.') : 'Thắng bản đồ trước để mở.'}</p>
          <button class="primary" data-start-map="${m.id}" ${unlocked ? '' : 'disabled'}>▶ Chơi bản đồ này</button>
          ${done ? `<button class="primary endless" data-start-endless="${m.id}">♾ Chế độ Vô Tận${endlessBest > 0 ? ` (kỷ lục: đợt ${endlessBest})` : ''}</button>` : ''}
        </div>`;
    }).join('');

    const nodes = DAO_NGO_NODES.map((n) => {
      const owned = progress.ownedNodes.includes(n.id);
      const afford = progress.daoNgoPoints >= n.cost;
      return `<div class="recipe ${owned ? 'unlocked' : ''}">${owned ? '✅' : '🌿'} <b>${n.name}</b> — ${n.cost} điểm<br><small>${n.desc}</small>
        ${owned ? '' : `<button data-buy-node="${n.id}" ${afford ? '' : 'disabled'}>Mua (${n.cost} điểm)</button>`}</div>`;
    }).join('');

    this.el.innerHTML = `
      <div class="menu-card">
        <h2>🏹 Chế độ Dã Chiến (E5)</h2>
        <div class="map-card">
          <h3>🏹 Dã Chiến — Một mình giữa vòng vây</h3>
          <p>Chế độ chơi riêng, không thay thế thủ trận pháp: bản đồ lớn 80×80, camera bám theo nhân vật, quái cùng kích thước với nhân vật kéo tới thành bầy. Điều khiển trực tiếp bằng WASD/phím mũi tên/click, đạn tỏa nhiều tia, nhặt Linh Thạch + tinh rơi ra trên đất.</p>
          <p class="dim">Sống sót 5 phút = thắng · HP về 0 = thua · Boss dã chiến ở phút thứ 4</p>
          <button class="primary" data-start-field>▶ Vào Dã Chiến</button>
        </div>
        <h2>⚖️ Ngũ Hành Trận Thủ — Chọn bản đồ</h2>
        <p class="dim">Thắng một bản đồ để mở bản đồ kế tiếp và nhận điểm Đạo Ngộ (lần đầu +2, thắng lại +1). Tiến độ lưu trên trình duyệt này.</p>
        <div class="map-list">${cards}</div>
        <h2>🌿 Cây Đạo Ngộ — <span style="color:#fff">${progress.daoNgoPoints} điểm</span></h2>
        <div class="panel" style="margin-bottom:10px">${nodes}</div>
        <h2>⚙ Cài đặt</h2>
        <div class="panel">
          <p style="margin:0">🕹 Di chuyển nhân vật (E6): trong chế độ thủ trận, <b>WASD/phím mũi tên và click ra lệnh di chuyển luôn bật</b> như Dã Chiến — nhân vật đi tự do khắp bản đồ lớn, camera bám theo, phím <b>T</b> để về tâm trận. Nhân vật vẫn tự đánh quái trong tầm. (Công tắc click-to-move của E3 đã được gộp vào điều khiển chung này.)</p>
        </div>
      </div>`;
  }

  hide(): void {
    this.el.classList.add('hidden');
    this.el.innerHTML = '';
  }
}
