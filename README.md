# Ngũ Hành Trận Thủ — MVP

Game thủ thành tu tiên 2.5D isometric: xây trận pháp tròn đồng tâm gồm 2 vòng × 5 ô trụ ngũ hành (Kim/Mộc/Thủy/Hỏa/Thổ) quanh một trụ trung tâm, chống 5 đợt quái để mở khóa chiêu thức cho nhân vật.

Dự án này tách riêng khỏi *Vạn Đạo Trường Sinh* và *Trận Pháp Nhân Quả*. Bản thiết kế gốc: `~/workspace/your_files/ngu-hanh-tran-thu/thiet-ke-MVP-ngu-hanh-tran-thu.md`.

## Cách chạy

Cần Node.js (đã kiểm chứng với Node 24). Mở Terminal trong thư mục dự án:

```bash
npm install     # cài thư viện (chỉ lần đầu)
npm run dev     # mở địa chỉ Vite in ra (thường là http://localhost:5173)
```

Muốn chơi nhanh không cần Terminal: mở file `preview/ngu-hanh-tran-thu-mvp.html` bằng trình duyệt (double-click).

Các lệnh khác:

```bash
npm test            # chạy test Vitest (logic: tài nguyên, công thức, AoE, rơi đồ, thắng/thua)
npm run build       # kiểm tra TypeScript + build bản production vào dist/
npm run make-preview  # sau khi build: gộp dist thành preview 1 file
```

## Cách chơi

1. **Giai đoạn xây dựng:** bấm vào một ô trụ trên trận pháp → chọn hệ để xây (giá 40 Linh Thạch + 5 tinh cùng hệ; bắt đầu có 200 Linh Thạch + 10 tinh mỗi hệ). Bấm vào trụ đã xây để xem chỉ số hoặc phá hủy (**phá không hoàn tài nguyên**). Hệ của đợt quái sắp tới được báo trước để xếp trận có chủ đích.
2. Bấm **Bắt đầu đợt** → giai đoạn chiến đấu: không xây/phá được nữa. Trụ tự đánh, nhân vật tự đánh quái gần nhất, tuyệt kỹ mỗi vòng tự nổ theo cooldown.
3. Quái chết rơi Linh Thạch + tinh **đúng hệ của quái**. Hết đợt lại về giai đoạn xây dựng để chỉnh trận.
4. **Thắng:** qua hết đợt 5. **Thua:** trung tâm HP = 0 hoặc nhân vật HP = 0. Màn hình kết quả hiện thống kê và nút Chơi lại.
5. Nút ⏸ tạm dừng và nút tốc độ 1x/2x ở thanh trên cùng.

## Cơ chế cốt lõi

- **Mỗi trụ đánh độc lập** với hiệu ứng riêng: Kim chí mạng ×2, Mộc trói 0.6s, Thủy chậm 30%, Hỏa nổ lan diện nhỏ, Thổ choáng 0.3s.
- **Thuộc tính nhân vật** tăng theo số trụ đang sống mỗi hệ (Kim +DMG/crit, Mộc +hồi máu/max HP, Thủy +giáp/né, Hỏa +DMG kỹ năng, Thổ +max HP/giáp) — trụ bị phá thì mất phần cộng đó.
- **Kỹ năng nhân vật:** bấm nút kỹ năng ở panel phải khi đủ mana và hết hồi chiêu. Mana tối đa 100, hồi 4/giây, bắt đầu đầy 100 *(giá trị do bản thiết kế để mở, chọn tại `src/config/balance.ts`)*. Chiêu đã mở khóa giữ vĩnh viễn trong ván.

## Ba quy tắc đã duyệt (D1 / D2 / D4)

- **D1 — Công thức:** tính theo số lượng mỗi hệ **trong một vòng**, không tính thứ tự ô; một trụ tính đồng thời cho mọi công thức của chính vòng đó, không tính sang vòng khác. Đủ công thức → mở khóa kỹ năng **vĩnh viễn**, trụ bị phá sau đó không mất chiêu.
- **D2 — Tuyệt kỹ AoE của vòng:** cần ≥3 trụ đang sống mới chạy cooldown (dưới 3 trụ thì cooldown **đóng băng**); tự nổ khi có ≥3 quái trong bán kính vòng; sức mạnh 60%/80%/100% theo 3/4/5 trụ sống; mỗi vòng một cooldown riêng (Vòng 1: Ngũ Hành Lôi 45 dmg/CD 12s, Vòng 2: Thiên Địa Trấn 80 dmg + choáng 0.5s/CD 18s).
- **D4 — Quái phá trụ:** quái đi thẳng về trung tâm, chỉ dừng đánh trụ khi trụ trong tầm bám 1.1 trên đường đi; nhân vật chỉ bị quái nhắm khi ở gần quái hơn trung tâm và không có trụ nào trong tầm bám.

## Cấu trúc mã

```
src/config/  balance.ts (mọi hằng số), towers.ts, enemies.ts, waves.ts, recipes.ts, skills.ts
src/sim/     state, resources, formation (D1/D2), towers, enemies (D4), hero, skills, waves, combat — thuần TS, không DOM
src/render/  iso.ts (chiếu isometric), renderer.ts (Canvas 2D)
src/ui/      hud.ts (HUD DOM tiếng Việt)
src/main.ts  vòng lặp tick cố định 20Hz + render
tests/       Vitest: resources, formation, combat, waves
```

Mọi chỉ số gameplay nằm trong `src/config/` — chỉnh cân bằng ở đó, không sửa logic.

## Phạm vi MVP (không làm)

3–5 vòng, nâng cấp trụ, boss, nhiều bản đồ/nhân vật, lưu game, multiplayer — xem Mục 11 của bản thiết kế.
