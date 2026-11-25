# Ngũ Hành Trận Thủ

Game thủ thành tu tiên 2.5D isometric: xây trận pháp tròn đồng tâm nhiều vòng trụ ngũ hành (Kim/Mộc/Thủy/Hỏa/Thổ) quanh một trụ trung tâm, chống 8 đợt quái mỗi bản đồ để mở khóa chiêu thức cho nhân vật, qua chiến dịch 3 bản đồ. Từ E5 có thêm chế độ **Dã Chiến**: bản đồ lớn 80×80, camera bám theo nhân vật, quái cùng kích thước với nhân vật kéo tới thành bầy (xem mục E5 bên dưới).

Dự án này tách riêng khỏi *Vạn Đạo Trường Sinh* và *Trận Pháp Nhân Quả*. Thiết kế: `docs/thiet-ke-mo-rong-sau-MVP.md` (lộ trình E1–E4) và bản thiết kế MVP gốc trong thư mục tài liệu của người dùng.

## Cách chạy

Cần Node.js (đã kiểm chứng với Node 24). Mở Terminal trong thư mục dự án:

```bash
npm install     # cài thư viện (chỉ lần đầu)
npm run dev     # mở địa chỉ Vite in ra (thường là http://localhost:5173)
```

Muốn chơi nhanh không cần Terminal: mở file `preview/ngu-hanh-tran-thu-mvp.html` bằng trình duyệt (double-click) — toàn bộ game đã gộp trong 1 file.

```bash
npm test            # chạy test Vitest (79 test: logic + cân bằng 3 bản đồ + dã chiến)
npm run build       # kiểm tra TypeScript + build production vào dist/
npm run make-preview  # sau khi build: gộp dist thành preview 1 file
```

## Cách chơi

1. **Chọn bản đồ** ở màn hình đầu (nút 🗺 Bản đồ để quay lại). Thắng bản đồ mở bản đồ kế tiếp; tiến độ lưu trong trình duyệt (localStorage).
2. **Giai đoạn xây dựng:** bấm vào một ô trụ → chọn hệ để xây (giá gốc 40 Linh Thạch + 5 tinh cùng hệ; bắt đầu ván có 200 Linh Thạch + 15 tinh mỗi hệ). Bấm vào trụ đã xây để xem chỉ số, **nâng cấp** hoặc phá hủy (**phá không hoàn tài nguyên**). Hệ của đợt quái sắp tới được báo trước.
3. Bấm **Bắt đầu đợt** → chiến đấu: không xây/phá/nâng được nữa. Trụ tự đánh, nhân vật tự đánh quái gần nhất, tuyệt kỹ mỗi vòng tự nổ theo cooldown. Quái chết rơi Linh Thạch + tinh **đúng hệ của quái**.
4. **Thắng bản đồ:** qua hết 8 đợt (có boss ở đợt 8). **Thua:** trung tâm HP = 0 hoặc nhân vật HP = 0.
5. Điều khiển phụ: ⏸ tạm dừng, tốc độ 1x/2x, 🔊 tắt/bật âm thanh + thanh âm lượng ở thanh trên cùng.

## Cơ chế theo giai đoạn phát triển

### MVP (nền tảng)
- Mỗi trụ đánh độc lập với hiệu ứng riêng: Kim chí mạng ×2, Mộc trói 0.6s, Thủy chậm 30%, Hỏa nổ lan diện nhỏ, Thổ choáng 0.3s.
- Thuộc tính nhân vật tăng theo số trụ đang sống mỗi hệ — trụ bị phá thì mất phần cộng.
- **D1 — Công thức:** tính theo số lượng mỗi hệ **trong một vòng**, không tính thứ tự ô; một trụ tính cho mọi công thức của vòng đó. Đủ công thức → mở khóa kỹ năng **vĩnh viễn** trong ván. Mọi vòng đều dùng công thức yêu cầu tổng 5 trụ; vòng lớn (6/8 ô) có ô dự phòng để duy trì trận khi trụ bị phá.
- **D2 — Tuyệt kỹ AoE của vòng:** cần ≥3 trụ đang sống mới chạy cooldown (dưới 3 thì **đóng băng**); tự nổ khi ≥3 quái trong bán kính vòng; sức mạnh 60%/80%/100% theo 3/4/≥5 trụ sống; mỗi vòng một cooldown và một tuyệt kỹ riêng (4 vòng = 4 tuyệt kỹ).
- **D4 — Quái phá trụ:** quái đi thẳng về trung tâm, chỉ dừng đánh trụ khi trụ trong tầm bám 1.1 trên đường đi; nhân vật chỉ bị nhắm khi gần quái hơn trung tâm và không có trụ trong tầm bám.

### E1 — Tương Sinh Tương Khắc
- **Tương sinh/khắc theo trụ KỀ NHAU trong vòng** (vẽ đường nối trên sân: vàng phát sáng = sinh, đỏ mờ = khắc): cặp tương sinh (chuỗi Kim→Thủy→Mộc→Hỏa→Thổ→Kim) cả hai trụ **+15% sát thương** mỗi phía kề (tối đa +30%); cặp tương khắc: trụ khắc **+10%**, trụ bị khắc **−10%**. Tính lại ngay khi trụ được xây/bị phá.
- **Nâng cấp trụ tối đa cấp 3:** cấp 2 = ×1.6 sát thương, +50% HP, giá 60% giá xây; cấp 3 = ×2.5 sát thương, hiệu ứng phụ ×1.5, giá 120% giá xây. Chỉ nâng ở giai đoạn xây dựng.
- **Vai trò quái:** Tốc (nhanh, yếu), Giáp (trâu, chủ động tìm phá trụ, sát thương lên trụ đã giảm còn ×1.2 sau cân bằng E4), Xa (dừng ở tầm 2.5 bắn trụ/trung tâm, không áp sát), Hồi (hồi 10 HP × hệ số đợt cho đồng minh quanh mỗi 2.5s, không hồi chính mình/boss). Xuất hiện dần: đợt 2 Tốc, 3 Giáp, 4 Xa, 6 Hồi.
- **Boss đợt 8:** HP ×10 chỉ số đợt, to gấp đôi, miễn trói/choáng trong nửa đầu mỗi chu kỳ 4s, rơi 60 Linh Thạch + 12 tinh.
- **Linh Mạch:** mỗi đợt 1–2 ô ngẫu nhiên được đánh dấu (hiện từ giai đoạn xây): trụ trên ô +25% sát thương trong đợt đó.

### E2 — Chiến dịch 3 bản đồ
- **Bản đồ 1 — Sơn Môn:** 2 vòng (5+5 ô), 4 cổng, quái ×1.0 HP. **Bản đồ 2 — Linh Khê Cốc:** thêm vòng 3 (6 ô), 6 cổng, quái ×1.2 HP. **Bản đồ 3 — Hắc Phong Lâm:** thêm vòng 4 (8 ô), 6 cổng, quái ×1.2 HP, trung tâm có **2 lớp HP**: khiên ngoài 400 hứng đòn trước, cạn khiên mới trừ HP chính.
- Vòng 3 có 5 công thức hỗn hợp + tuyệt kỹ Lục Hợp Chấn; vòng 4 có 5 công thức thuần hệ + tuyệt kỹ Vạn Pháp Quy Tông (tổng 20 kỹ năng nhân vật).
- **Mã trận hình:** panel bên phải cho xuất mã (tự lưu làm mẫu của bản đồ) và nhập mã để dựng lại trận ở giai đoạn xây — thiếu tài nguyên thì xây phần đủ tiền và báo cáo số trụ bị bỏ qua. Định dạng `NH1.<mapId>.<thân mã>`, thân mã gồm 2 ký tự cho mỗi ô: chữ cái hệ (K/M/W/F/E) + số cấp, hoặc `..` nếu ô trống.

### E3 — Tiến triển dài hạn
- **Cây Đạo Ngộ 12 nút** (ở màn hình chọn bản đồ): thắng bản đồ lần đầu +2 điểm, thắng lại +1 điểm. Nút gồm: +100/+200 Linh Thạch đầu ván, +5 tinh/hệ đầu ván, giảm 20% giá trụ từng hệ (5 nút), +100 HP trung tâm, +1 ô Linh Mạch mỗi đợt, +40 HP nhân vật, tuyệt kỹ hồi chiêu nhanh hơn 15%. Không có nút tiên quyết. Hiệu ứng áp vào ván mới qua bộ sửa đổi (RunModifiers) — giảm giá áp cho cả xây và nâng cấp.
- **Chế độ Vô Tận:** mở cho từng bản đồ sau khi thắng bản đồ đó. Sau đợt 8: mỗi đợt +5 quái, HP quái ×1.12 lũy tiến mỗi đợt, boss ở đợt chia hết cho 5. Kỷ lục đợt cao nhất theo bản đồ lưu local và hiện ở màn hình chọn bản đồ + màn hình kết quả.
- **Click để di chuyển (tùy chọn, mặc định TẮT):** bật trong mục Cài đặt ở màn hình chọn bản đồ. Khi bật, bấm vào khoảng trống trên chiến trường để ra lệnh nhân vật đi tới điểm đó (bị kẹp trong bán kính hoạt động quanh trung tâm); nhân vật vẫn tự đánh quái trong tầm. Tắt thì nhân vật tự chiến đấu hoàn toàn như cũ.

### E5 — Dã Chiến (chế độ chơi mới, không thay thế thủ trận pháp)
- **Vào chế độ:** ở màn hình chọn bản đồ (hiện khi mở game, hoặc nút 🗺 Bản đồ), bấm **▶ Vào Dã Chiến** ở thẻ trên cùng. Muốn quay lại thủ trận pháp: mở 🗺 Bản đồ rồi chọn một bản đồ như cũ. Hai chế độ dùng chung nút tạm dừng / tốc độ / âm thanh.
- **Điều khiển:** WASD hoặc phím mũi tên để chạy (giữ phím), **click chuột** để ra lệnh chạy tới một điểm; nhân vật tự động bắn **loạt 5 tia đạn** vào các quái gần nhất trong tầm 6.5. Kỹ năng chủ động: phím **1** Ngũ Hành Bạo (nổ diện quanh thân), **2** Vạn Kiếm Vũ (mưa kiếm xuống cụm quái đông nhất), **3** Hồi Sinh Thuật (hồi 90 HP) — hoặc bấm nút kỹ năng ở panel phải; đều tốn mana + có cooldown như hệ kỹ năng thủ trận.
- **Luật chơi:** bản đồ 80×80, camera bám mượt theo nhân vật và kẹp ở biên bản đồ (khung nhìn ~18×13). Quái **cùng kích thước với nhân vật** (0.9 đơn vị; tinh anh 1.4 xuất hiện sau 45s, **boss dã chiến 1.8 ở phút thứ 4**) spawn thành bầy **ngoài khung hình** quanh nhân vật rồi lao vào vây; nhịp spawn nhanh dần mỗi 30s, tối đa 120 quái sống cùng lúc. Quái chạm vào người thì đánh theo nhịp 1 đòn/giây. Quái chết rơi **Linh Thạch + tinh đúng hệ** thành vật phẩm trên đất — đi tới gần (≤2.4) chúng **tự hút về** và nhặt khi chạm. **Thắng:** sống sót đủ 5 phút. **Thua:** HP nhân vật về 0. Màn hình kết quả hiện thời gian sống, số quái đã diệt, tài nguyên đã nhặt. Tài nguyên dã chiến hiện mới ghi nhận trong phiên chơi (hiện ở thanh trên + màn hình kết quả), chưa liên thông kinh tế với chế độ thủ trận — để giai đoạn sau nếu cần.
- **Render theo lớp + SpriteRegistry (kiến trúc mở cho hình ảnh thật):** renderer dã chiến vẽ theo thứ tự lớp cố định khai báo trong `src/config/sprites.ts`: `ground → groundFx → shadow → entity (sắp theo Y) → projectile → fx`. Mỗi thực thể mang một `spriteId` (`hero`, `enemy-kim`…, `elite-hoa`…, `boss`, `pickup-lt`, `pickup-tinh`, `tile-ground`); registry tra manifest: có mục ảnh thì vẽ ảnh (neo + tỉ lệ theo manifest, ảnh nạp qua cache dùng chung), chưa có thì vẽ hình khối theo màu hệ. **Cách thêm hình thật sau này:** (1) bỏ file ảnh (PNG nền trong suốt là tốt nhất) vào dự án, ví dụ `public/sprites/hero.png`; (2) mở `src/config/sprites.ts`, thêm vào mục tương ứng trong `SPRITE_MANIFEST`: `image: { src: 'sprites/hero.png', anchorX: 0.5, anchorY: 1, scale: 1 }` (anchorY = 1 là neo chân — nhân vật đứng trên đất); (3) chạy lại game — renderer tự dùng ảnh, không cần sửa logic hay code vẽ. Chưa có ảnh nào cũng không sao: game chạy hoàn toàn bằng hình khối như hiện tại.
- Mọi con số của dã chiến (cỡ bản đồ, trần quái, nhịp spawn, sát thương, phần thưởng…) nằm trong `src/config/field.ts`; sim ở `src/sim/field.ts` (thuần TS, tick 20Hz, tách khỏi render như mọi module khác).

### E4 — Hoàn thiện & cân bằng
- **Âm thanh tổng hợp WebAudio** (không file nhạc): mỗi hệ trụ một tiếng bắn riêng, tuyệt kỹ, xây/phá/nâng trụ, quái chết, trung tâm bị đánh, bắt đầu đợt, thắng/thua. Nút 🔊 + thanh âm lượng ở thanh trên, lưu vào cài đặt; âm thanh chỉ khởi tạo sau tương tác đầu tiên của người dùng và tự bỏ qua nếu trình duyệt không hỗ trợ.
- **Hiệu ứng:** hạt bùng khi tuyệt kỹ nổ và khi Hỏa trụ nổ lan; tuyệt kỹ lớn có vòng sáng kép + quầng mờ; **rung màn hình** 0.25s khi trung tâm bị đánh; ô Linh Mạch nhấp nháy; quái vẽ theo vai trò (Giáp có khung khiên, Xa có vòng ngắm, Hồi có dấu +, Boss có vương miện và thanh máu vàng).
- **Cân bằng cuối (số liệu đã chốt trong `src/config/`):** người chơi mẫu dùng tài nguyên thật (không bơm tiền, xếp chuỗi tương sinh, nâng cấp vòng trong trước) thắng cả 3 bản đồ — bản đồ 2 thắng với trung tâm còn 35/300 HP, bản đồ 3 thắng khi khiên 400 bị phá hết và tâm còn 142/300 (kiểm chứng tự động trong `tests/balance-maps.test.ts`). Các chỉnh chính: phần thưởng quái 8 Linh Thạch + 3 tinh; tinh khởi đầu 15/hệ; sát thương Giáp lên trụ ×1.2; HP quái đợt 6–8 tăng chậm hơn (×2.15/2.30/2.45); nhân vật 240 HP, 3 giáp cơ bản, hồi 0.6 HP/s; tầm đánh mọi trụ +0.2; boss ×10 HP.

## Cấu trúc mã

```
src/config/  balance, towers, enemies, waves, recipes, skills, maps, daongo — MỌI chỉ số ở đây
             field.ts (E5: mọi chỉ số dã chiến), sprites.ts (E5: thứ tự lớp vẽ + manifest SpriteRegistry)
src/sim/     state (layout theo bản đồ), resources, formation (D1/D2 + sinh/khắc), towers,
             enemies (D4 + vai trò), hero, skills, waves, combat, daongo, formationCode — thuần TS, không DOM
             field.ts (E5: sim dã chiến — camera, spawn bầy, đạn, vật phẩm hút — thuần TS, không DOM)
src/render/  iso.ts (chiếu isometric), renderer.ts (Canvas 2D, thủ trận),
             fieldRenderer.ts (E5: render dã chiến theo lớp + SpriteRegistry, culling theo camera)
src/ui/      hud.ts, menu.ts (chọn chế độ/bản đồ/Đạo Ngộ/cài đặt), audio.ts (WebAudio),
             fieldHud.ts (E5: HUD dã chiến)
src/persistence.ts  localStorage: tiến độ, preset, điểm Đạo Ngộ, kỷ lục, cài đặt (hàm thuần, có test)
src/main.ts  vòng lặp tick cố định 20Hz + render + xả hàng đợi âm thanh (chuyển 2 chế độ ở đây)
tests/       Vitest: resources, formation, combat, waves, e1-synergy, e2-maps, e3-daongo, e4-polish, smoke, balance-maps, field (E5)
```

Sim không chứa DOM; localStorage chỉ được chạm qua `src/persistence.ts`; âm thanh đi qua hàng đợi sự kiện `state.sounds` để sim vẫn thuần dữ liệu.

## Phạm vi (vẫn không làm)
Multiplayer/PvP, gacha, cửa hàng tiền thật, tài khoản/cloud save, cốt truyện — theo Mục 6 của bản thiết kế mở rộng.
