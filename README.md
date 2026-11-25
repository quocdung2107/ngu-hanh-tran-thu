# Ngũ Hành Trận Thủ

Game thủ thành tu tiên 2.5D isometric: xây trận pháp tròn đồng tâm nhiều vòng trụ ngũ hành (Kim/Mộc/Thủy/Hỏa/Thổ) quanh một trụ trung tâm, chống 8 đợt quái mỗi bản đồ để mở khóa chiêu thức cho nhân vật, qua chiến dịch 3 bản đồ. Từ E5 có thêm chế độ **Dã Chiến**: bản đồ lớn 80×80, camera bám theo nhân vật, quái cùng kích thước với nhân vật kéo tới thành bầy (xem mục E5 bên dưới). Từ E6, chế độ thủ trận cũng chơi trên **bản đồ lớn với camera bám nhân vật và nhân vật đi lại tự do** — toàn bộ luật trận pháp giữ nguyên (xem mục E6 bên dưới).

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
- (E6) Cạnh bản đồ lần lượt **60 / 70 / 80** đơn vị, trận pháp ở tâm bản đồ, cổng spawn nằm sát biên bản đồ — quái hành quân từ biên về tâm.
- Vòng 3 có 5 công thức hỗn hợp + tuyệt kỹ Lục Hợp Chấn; vòng 4 có 5 công thức thuần hệ + tuyệt kỹ Vạn Pháp Quy Tông (tổng 20 kỹ năng nhân vật).
- **Mã trận hình:** panel bên phải cho xuất mã (tự lưu làm mẫu của bản đồ) và nhập mã để dựng lại trận ở giai đoạn xây — thiếu tài nguyên thì xây phần đủ tiền và báo cáo số trụ bị bỏ qua. Định dạng `NH1.<mapId>.<thân mã>`, thân mã gồm 2 ký tự cho mỗi ô: chữ cái hệ (K/M/W/F/E) + số cấp, hoặc `..` nếu ô trống.

### E3 — Tiến triển dài hạn
- **Cây Đạo Ngộ 12 nút** (ở màn hình chọn bản đồ): thắng bản đồ lần đầu +2 điểm, thắng lại +1 điểm. Nút gồm: +100/+200 Linh Thạch đầu ván, +5 tinh/hệ đầu ván, giảm 20% giá trụ từng hệ (5 nút), +100 HP trung tâm, +1 ô Linh Mạch mỗi đợt, +40 HP nhân vật, tuyệt kỹ hồi chiêu nhanh hơn 15%. Không có nút tiên quyết. Hiệu ứng áp vào ván mới qua bộ sửa đổi (RunModifiers) — giảm giá áp cho cả xây và nâng cấp.
- **Chế độ Vô Tận:** mở cho từng bản đồ sau khi thắng bản đồ đó. Sau đợt 8: mỗi đợt +5 quái, HP quái ×1.12 lũy tiến mỗi đợt, boss ở đợt chia hết cho 5. Kỷ lục đợt cao nhất theo bản đồ lưu local và hiện ở màn hình chọn bản đồ + màn hình kết quả.
- **Click để di chuyển (E3, đã được E6 thay thế):** ở E3 đây là tùy chọn mặc định TẮT trong Cài đặt, đích đến bị kẹp trong bán kính hoạt động quanh tâm. Từ E6, điều khiển đã gộp chung như Dã Chiến — WASD/click luôn bật và không còn bán kính hoạt động (xem mục E6). Trường cài đặt vẫn được giữ trong dữ liệu lưu để tương thích.

### E5 — Dã Chiến (chế độ chơi mới, không thay thế thủ trận pháp)
- **Vào chế độ:** ở màn hình chọn bản đồ (hiện khi mở game, hoặc nút 🗺 Bản đồ), bấm **▶ Vào Dã Chiến** ở thẻ trên cùng. Muốn quay lại thủ trận pháp: mở 🗺 Bản đồ rồi chọn một bản đồ như cũ. Hai chế độ dùng chung nút tạm dừng / tốc độ / âm thanh.
- **Điều khiển:** WASD hoặc phím mũi tên để chạy (giữ phím), **click chuột** để ra lệnh chạy tới một điểm; nhân vật tự động bắn **loạt 5 tia đạn** vào các quái gần nhất trong tầm 6.5. Kỹ năng chủ động: phím **1** Ngũ Hành Bạo (nổ diện quanh thân), **2** Vạn Kiếm Vũ (mưa kiếm xuống cụm quái đông nhất), **3** Hồi Sinh Thuật (hồi 90 HP) — hoặc bấm nút kỹ năng ở panel phải; đều tốn mana + có cooldown như hệ kỹ năng thủ trận.
- **Luật chơi:** bản đồ 80×80, camera bám mượt theo nhân vật và kẹp ở biên bản đồ (khung nhìn ~18×13). Quái **cùng kích thước với nhân vật** (0.9 đơn vị; tinh anh 1.4 xuất hiện sau 45s, **boss dã chiến 1.8 ở phút thứ 4**) spawn thành bầy **ngoài khung hình** quanh nhân vật rồi lao vào vây; nhịp spawn nhanh dần mỗi 30s, tối đa 120 quái sống cùng lúc. Quái chạm vào người thì đánh theo nhịp 1 đòn/giây. Quái chết rơi **Linh Thạch + tinh đúng hệ** thành vật phẩm trên đất — đi tới gần (≤2.4) chúng **tự hút về** và nhặt khi chạm. **Thắng:** sống sót đủ 5 phút. **Thua:** HP nhân vật về 0. Màn hình kết quả hiện thời gian sống, số quái đã diệt, tài nguyên đã nhặt. Tài nguyên dã chiến hiện mới ghi nhận trong phiên chơi (hiện ở thanh trên + màn hình kết quả), chưa liên thông kinh tế với chế độ thủ trận — để giai đoạn sau nếu cần.
- **Render theo lớp + SpriteRegistry (kiến trúc mở cho hình ảnh thật):** renderer dã chiến vẽ theo thứ tự lớp cố định khai báo trong `src/config/sprites.ts`: `ground → groundFx → shadow → entity (sắp theo Y) → projectile → fx`. Mỗi thực thể mang một `spriteId` (`hero`, `enemy-kim`…, `elite-hoa`…, `boss`, `pickup-lt`, `pickup-tinh`, `tile-ground`); registry tra manifest: có mục ảnh thì vẽ ảnh (neo + tỉ lệ theo manifest, ảnh nạp qua cache dùng chung), chưa có thì vẽ hình khối theo màu hệ. **Cách thêm hình thật sau này:** (1) bỏ file ảnh (PNG nền trong suốt là tốt nhất) vào dự án, ví dụ `public/sprites/hero.png`; (2) mở `src/config/sprites.ts`, thêm vào mục tương ứng trong `SPRITE_MANIFEST`: `image: { src: 'sprites/hero.png', anchorX: 0.5, anchorY: 1, scale: 1 }` (anchorY = 1 là neo chân — nhân vật đứng trên đất); (3) chạy lại game — renderer tự dùng ảnh, không cần sửa logic hay code vẽ. Chưa có ảnh nào cũng không sao: game chạy hoàn toàn bằng hình khối như hiện tại.
- Mọi con số của dã chiến (cỡ bản đồ, trần quái, nhịp spawn, sát thương, phần thưởng…) nằm trong `src/config/field.ts`; sim ở `src/sim/field.ts` (thuần TS, tick 20Hz, tách khỏi render như mọi module khác).

### E6 — Trận thủ trên bản đồ lớn (sân khấu + di chuyển kiểu Dã Chiến, luật trận pháp giữ nguyên)
- **Bản đồ lớn:** mỗi bản đồ thủ trận giờ là một thế giới vuông (60×60 / 70×70 / 80×80 theo bản đồ 1/2/3, khai trong `src/config/maps.ts`), trận pháp nằm ở **tâm bản đồ**, **cổng spawn dời ra sát biên** — quái xuất hiện ở biên và hành quân qua bản đồ về tâm theo đàn của từng đợt như luật đợt hiện tại. Khung hình chỉ còn thấy một phần bản đồ — đây là chủ đích: người chơi phải chọn ra xa đón đánh hoặc ở lại giữ tâm.
- **Camera bám nhân vật:** dùng chung module camera với Dã Chiến (`src/sim/camera.ts`): bám mượt (lerp) theo nhân vật, đích camera được kẹp để khung hình không lộ ra ngoài bản đồ. Renderer thủ trận áp dụng phép biến đổi camera và chỉ vẽ phần trong khung hình (culling).
- **Nhân vật đi tự do toàn bản đồ ở cả 2 giai đoạn** (xây dựng lẫn chiến đấu): giữ **WASD/phím mũi tên** để chạy, hoặc **click vào khoảng trống** để ra lệnh đi tới điểm đó (đích được kẹp trong biên bản đồ). Nhân vật vẫn tự tấn công quái gần nhất trong tầm như trước — kể cả khi đang di chuyển; khi không có lệnh di chuyển, nhân vật vẫn tự áp sát quái gần nhất như cũ.
- **⚠ LUẬT CŨ ĐÃ BỎ:** giới hạn "nhân vật không rời trung tâm quá bán kính 6 đơn vị" (`homeRadius`) của các bản E1–E5 **đã bị loại bỏ hoàn toàn** ở E6. Giới hạn duy nhất còn lại là biên bản đồ.
- **Về tâm trận:** nút **🎯 Về tâm trận** trong panel Thông tin chiến đấu, hoặc phím **T** — dịch chuyển nhân vật về ngay tâm trận pháp và camera nhảy theo ngay lập tức, để không mất thời gian chạy về xây trận.
- **Xây trận trên bản đồ lớn:** ở giai đoạn xây dựng, di chuyển nhân vật/camera tới khu vực tâm (hoặc bấm T), click ô trụ để chọn/xây/phá như cũ — phép đổi tọa độ click đã tính qua camera nên chọn ô chính xác ở mọi vị trí camera. Khóa xây/phá trong giai đoạn chiến đấu giữ nguyên.
- **Render theo lớp + SpriteRegistry (như Dã Chiến):** renderer thủ trận vẽ theo đúng thứ tự `ground → groundFx → shadow → entity (sắp theo Y) → projectile → fx`; trụ được cấp spriteId riêng `tower-kim`, `tower-moc`, `tower-thuy`, `tower-hoa`, `tower-tho` và trung tâm là `center` trong `SPRITE_MANIFEST` — thêm ảnh thật cho trụ/trung tâm làm đúng 3 bước như mục E5, không sửa logic. Hình thức placeholder giữ nguyên.
- **Luật giữ nguyên tuyệt đối:** D1 (công thức theo số lượng trong vòng, mở khóa vĩnh viễn), D2 (tuyệt kỹ vòng ≥3 trụ sống, 60/80/100%), D4 (tầm bám phá trụ 1.1), tương sinh/khắc kề nhau, nâng cấp 3 cấp + phá không hoàn tài nguyên, Linh Mạch theo đợt, hệ đợt báo trước, rơi tinh đúng hệ, 8 đợt + boss đợt 8, thắng khi qua hết đợt / thua khi HP tâm = 0 hoặc HP nhân vật = 0, bản đồ 3 tâm 2 lớp HP, Đạo Ngộ, Vô Tận (chạy trên bản đồ lớn như thường), mã trận hình và tiến độ lưu local — tất cả không đổi, chỉ chạy trên sân khấu mới.
- **Cân bằng lại trên sân khấu lớn (đã kiểm chứng tự động):** người chơi mẫu trong test được nâng cấp thành *người chơi biết đi lại* — xây trận ở tâm, khi đánh thì tuần tra ở điểm chặn giữa tâm và cụm quái gần tâm nhất (không quá 9 đơn vị khỏi tâm). Kết quả: thắng cả 3 bản đồ nhưng không trắng — bản đồ 1 tâm còn 282/300; bản đồ 2 tâm nguyên vẹn nhưng nhân vật chỉ còn 118 HP; bản đồ 3 khiên mất 60/400 và nhân vật còn 23 HP. **Số đã đổi duy nhất:** tốc độ quái cơ bản `ENEMY_BASE.speed` 0.55 → **1.1** (hành quân xa gấp ~4 lần; nếu giữ tốc độ cũ, quái đến quá rải rác và mỗi đợt kéo dài 60–90s+; với tốc độ mới mỗi đợt khoảng 28–66 giây mô phỏng). Mọi số khác giữ nguyên.

### E4 — Hoàn thiện & cân bằng
- **Âm thanh tổng hợp WebAudio** (không file nhạc): mỗi hệ trụ một tiếng bắn riêng, tuyệt kỹ, xây/phá/nâng trụ, quái chết, trung tâm bị đánh, bắt đầu đợt, thắng/thua. Nút 🔊 + thanh âm lượng ở thanh trên, lưu vào cài đặt; âm thanh chỉ khởi tạo sau tương tác đầu tiên của người dùng và tự bỏ qua nếu trình duyệt không hỗ trợ.
- **Hiệu ứng:** hạt bùng khi tuyệt kỹ nổ và khi Hỏa trụ nổ lan; tuyệt kỹ lớn có vòng sáng kép + quầng mờ; **rung màn hình** 0.25s khi trung tâm bị đánh; ô Linh Mạch nhấp nháy; quái vẽ theo vai trò (Giáp có khung khiên, Xa có vòng ngắm, Hồi có dấu +, Boss có vương miện và thanh máu vàng).
- **Cân bằng cuối (số liệu đã chốt trong `src/config/`):** người chơi mẫu dùng tài nguyên thật (không bơm tiền, xếp chuỗi tương sinh, nâng cấp vòng trong trước) thắng cả 3 bản đồ — trên sân khấu cũ: bản đồ 2 thắng với trung tâm còn 35/300 HP, bản đồ 3 thắng khi khiên 400 bị phá hết và tâm còn 142/300. **Trên sân khấu lớn E6, số đo hiện hành nằm ở mục E6 phía trên** (kiểm chứng tự động trong `tests/balance-maps.test.ts`). Các chỉnh chính: phần thưởng quái 8 Linh Thạch + 3 tinh; tinh khởi đầu 15/hệ; sát thương Giáp lên trụ ×1.2; HP quái đợt 6–8 tăng chậm hơn (×2.15/2.30/2.45); nhân vật 240 HP, 3 giáp cơ bản, hồi 0.6 HP/s; tầm đánh mọi trụ +0.2; boss ×10 HP.

## Cấu trúc mã

```
src/config/  balance, towers, enemies, waves, recipes, skills, maps, daongo — MỌI chỉ số ở đây
             field.ts (E5: mọi chỉ số dã chiến), sprites.ts (E5: thứ tự lớp vẽ + manifest SpriteRegistry)
src/sim/     state (layout theo bản đồ), resources, formation (D1/D2 + sinh/khắc), towers,
             enemies (D4 + vai trò), hero, skills, waves, combat, daongo, formationCode — thuần TS, không DOM
             field.ts (E5: sim dã chiến — spawn bầy, đạn, vật phẩm hút — thuần TS, không DOM)
             camera.ts (E6: camera bám nhân vật DÙNG CHUNG cho thủ trận + dã chiến)
src/render/  iso.ts (chiếu isometric + gốc chiếu theo camera), renderer.ts (E6: thủ trận theo lớp + camera + culling + SpriteRegistry cho trụ),
             fieldRenderer.ts (E5: render dã chiến theo lớp + SpriteRegistry, culling theo camera)
src/ui/      hud.ts, menu.ts (chọn chế độ/bản đồ/Đạo Ngộ/cài đặt), audio.ts (WebAudio),
             fieldHud.ts (E5: HUD dã chiến)
src/persistence.ts  localStorage: tiến độ, preset, điểm Đạo Ngộ, kỷ lục, cài đặt (hàm thuần, có test)
src/main.ts  vòng lặp tick cố định 20Hz + render + xả hàng đợi âm thanh (chuyển 2 chế độ ở đây)
tests/       Vitest: resources, formation, combat, waves, e1-synergy, e2-maps, e3-daongo, e4-polish, smoke, balance-maps, field (E5), e6-large-map (E6)
```

Sim không chứa DOM; localStorage chỉ được chạm qua `src/persistence.ts`; âm thanh đi qua hàng đợi sự kiện `state.sounds` để sim vẫn thuần dữ liệu.

## Phạm vi (vẫn không làm)
Multiplayer/PvP, gacha, cửa hàng tiền thật, tài khoản/cloud save, cốt truyện — theo Mục 6 của bản thiết kế mở rộng.
