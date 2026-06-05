# Hướng dẫn chỉnh sửa ĐATN
## FaceZ HRMS — Nguyễn Thanh Bách (20204812)

> **Mức độ ưu tiên:** 🔴 Bắt buộc sửa · 🟡 Nên sửa · 🟢 Gợi ý cải thiện  
> **Quy ước vị trí:** `[Dòng ~N]` chỉ vị trí xấp xỉ trong file `.md` gốc

---

## I. LỜI CẢM ƠN

### 🟡 Câu cuối dùng từ ngữ thiên về cảm xúc cá nhân

**Vị trí:** Đoạn cuối Lời cảm ơn

**Vấn đề:** Câu *"Đồ án này là kết quả của một hành trình dài... một sản phẩm mà em tự hào đã xây dựng từ đầu đến cuối"* mang tính phóng đại và thiên về cảm xúc cá nhân, không phù hợp văn phong khoa học theo quy định template.

**Hướng sửa:** Lược bỏ câu này hoặc thay bằng một câu trung tính, ví dụ: *"Em hy vọng đồ án này đóng góp một phần nhỏ vào hướng nghiên cứu và ứng dụng thực tế trong lĩnh vực quản lý nhân sự."*

---

## II. CHƯƠNG 1 — GIỚI THIỆU ĐỀ TÀI

### 🔴 [1.1.1] Số liệu số lượng doanh nghiệp công nghệ sai

**Vị trí:** Đoạn 1, mục 1.1.1 — *"số lượng doanh nghiệp công nghệ tại Việt Nam đã vượt mốc **35.000** đơn vị vào năm 2024"*

**Vấn đề:** Con số thực tế theo nhiều nguồn thống kê là **70.000–75.000** doanh nghiệp công nghệ số vào thời điểm này — gần gấp đôi con số trong đồ án. Đây là sai số đáng kể và có thể bị hội đồng chất vấn.

**Hướng sửa:** Thay `35.000` thành `75.000` và bổ sung trích dẫn nguồn cụ thể, ví dụ từ VINASA hoặc báo cáo của Bộ TT&TT.

---

### 🔴 [1.1.2] Nhận định về MISA HRM không còn chính xác

**Vị trí:** Đoạn mô tả nhóm phần mềm nội địa trong mục 1.1.2 — *"hầu hết không cung cấp API mở để tích hợp với thiết bị chấm công của bên thứ ba theo chuẩn REST"*

**Vấn đề:** MISA AMIS HRM hiện đã có API Kết nối và hỗ trợ tích hợp trực tiếp với các thiết bị chấm công bên thứ ba, kể cả thiết bị nhận diện khuôn mặt như Hanet AI. Nhận định này nếu để nguyên sẽ là điểm yếu lớn khi hội đồng kiểm chứng.

**Hướng sửa:** Điều chỉnh lập luận sang hạn chế thực sự của MISA:

- API của MISA được thiết kế theo hướng **xuất dữ liệu từ MISA ra phần mềm khác**, không phải nhận sự kiện thời gian thực từ thiết bị (push event) — đây là khác biệt kiến trúc quan trọng so với FaceZ HRMS.
- Cấu trúc SaaS đóng không cho phép doanh nghiệp **tùy biến luồng phê duyệt** hay **công thức tính lương** theo đặc thù riêng.
- Thiếu cơ chế **phân tách nhiệm vụ HR/Finance/Director** được thực thi ở tầng server (server-side enforcement).

Ví dụ cách viết lại: *"Nhóm phần mềm nội địa như MISA HRM và Base HR có ưu thế về am hiểu thị trường và hỗ trợ pháp lý Việt Nam, tuy nhiên kiến trúc SaaS đóng hạn chế khả năng tùy biến quy trình phê duyệt nội bộ theo đặc thù từng doanh nghiệp. API tích hợp được thiết kế theo hướng xuất dữ liệu định kỳ thay vì nhận sự kiện theo thời gian thực từ thiết bị. Quan trọng hơn, hầu hết không có cơ chế phân tách nhiệm vụ giữa HR, Kế toán và Ban Giám đốc được thực thi ở tầng ứng dụng, để lại rủi ro kiểm soát nội bộ đáng kể."*

---

### 🔴 [1.1.2] Nhận định về Base HR cần điều chỉnh

**Vị trí:** Đoạn mô tả Base HR trong mục 1.1.2 — *"phân hệ tính lương thiếu hỗ trợ đầy đủ cho hệ số lương bậc và KPI song phần"*

**Vấn đề:** Base HRM+ thực tế hỗ trợ KPI/OKRs và tích hợp thiết bị chấm công nhận diện khuôn mặt. Bảng 2.1 ghi "Một phần" ở cột tích hợp chấm công là tương đối an toàn, nhưng đoạn mô tả trong văn bản tạo mâu thuẫn với bảng.

**Hướng sửa:** Tập trung vào hạn chế thực sự và đã kiểm chứng được của Base HR: mô hình giá theo số tài khoản leo thang nhanh khi doanh nghiệp tăng trưởng, và thiếu cơ chế phân tách nhiệm vụ HR/Finance/Director trong luồng tính lương — cả hai điểm này đều chính xác và thuyết phục hơn.

---

### 🔴 [1.1] Số liệu giảm trừ gia cảnh đã hết hiệu lực

**Vị trí:** Mục 1.1 — *"giảm trừ bản thân (11 triệu đồng/tháng), giảm trừ người phụ thuộc (4,4 triệu đồng/người/tháng)"*

**Vấn đề:** Theo Nghị quyết 110/2025/UBTVQH15, kể từ ngày **01/01/2026**, mức giảm trừ gia cảnh đã thay đổi: bản thân tăng lên **15,5 triệu đồng/tháng**, người phụ thuộc tăng lên **6,2 triệu đồng/tháng**. Đồ án nộp tháng 06/2026 nhưng dẫn số liệu của năm 2025. Điểm này cũng ảnh hưởng đến test case TC-PAY-09 ở Chương 4.

**Hướng sửa (hai phương án):**

- **Phương án 1 (cập nhật):** Sửa thành số liệu mới theo Nghị quyết 110/2025/UBTVQH15, cập nhật tương ứng ở Chương 5 và test case TC-PAY-09.
- **Phương án 2 (đóng khung thời gian — khuyến nghị):** Giữ nguyên số liệu nhưng thêm ghi chú: *"tính đến kỳ thiết kế hệ thống (năm 2025) theo Nghị quyết 954/2020/UBTVQH14"* và thêm câu nhấn mạnh rằng hệ thống cho phép cập nhật thông số qua `SystemConfig` mà không cần thay đổi code. Phương án này còn thể hiện được tính linh hoạt của kiến trúc — bản thân là điểm cộng khi hội đồng hỏi.

---

### 🟡 [1.1] Trần đóng BHXH và BHTN cần làm rõ

**Vị trí:** Mục 1.1 — *"Trần đóng bảo hiểm xã hội (BHXH, BHYT, BHTN) hiện ở mức 46,8 triệu đồng/tháng (tương đương 20 lần mức lương tối thiểu vùng I)"*

**Vấn đề:** Có hai điểm không chính xác: (1) Trần 46,8 triệu được tính bằng 20 lần **mức lương cơ sở** (2,34 triệu), không phải 20 lần lương tối thiểu vùng I (4,96 triệu). (2) Trần này chỉ áp dụng cho BHXH và BHYT — trần đóng **BHTN** khác hẳn, bằng 20 lần lương tối thiểu vùng (~99,2 triệu với vùng I). Gộp ba loại vào một trần duy nhất là không chính xác về mặt pháp lý.

**Hướng sửa:** Sửa thành *"tương đương 20 lần mức lương cơ sở"* và thêm ghi chú phân biệt trần BHXH/BHYT và BHTN nếu có đủ không gian.

---

### 🔴 [1.3] Mật độ thuật ngữ kỹ thuật quá cao so với vị trí Chương 1

**Vị trí:** Toàn bộ mục 1.3 — Định hướng giải pháp

**Vấn đề:** Template SOICT quy định Chương 1 chỉ cần *"nêu tên định hướng công nghệ/thuật toán, mô tả ngắn gọn trong một đến hai câu và giải thích nhanh lý do lựa chọn"*, không giải thích chi tiết kỹ thuật. Tuy nhiên mục 1.3 hiện chứa rất nhiều thuật ngữ kỹ thuật nội tại thuộc Chương 3: `Spring Security`, `Spring Data JPA`, `Spring Events`, `Flyway`, `Virtual Threads`, `I/O-bound`, `batch payroll`, `App Router`, `Server-Side Rendering`, `JSONB`, `partial unique index`, `database view`, `JWT`, `Access Token`, `HttpOnly cookie`, `SHA-256`.

**Hướng sửa:** Rút gọn mỗi đoạn công nghệ xuống 1–2 câu, chuyển chi tiết sang Chương 3. Ví dụ:

*Hiện tại (quá chi tiết):*
> "Spring Boot 4.0.0-M3 trên Java 21 được lựa chọn vì hệ sinh thái phong phú cho nghiệp vụ doanh nghiệp: Spring Security cho phân quyền, Spring Data JPA cho truy cập dữ liệu, Spring Events cho kiến trúc event-driven, và Flyway cho quản lý schema migration. Java 21 với Virtual Threads hỗ trợ xử lý đồng thời hiệu quả cho các tác vụ I/O-bound như batch payroll."

*Nên sửa thành:*
> "Về backend, đồ án chọn Spring Boot trên Java 21 vì hệ sinh thái trưởng thành phù hợp với nghiệp vụ doanh nghiệp và hỗ trợ xử lý đồng thời tốt cho tác vụ tính lương hàng loạt. Lý do lựa chọn chi tiết của từng công nghệ được phân tích trong Chương 3."

Áp dụng tương tự cho đoạn mô tả frontend (Next.js) và cơ sở dữ liệu (PostgreSQL, Redis).

---

### 🔴 [1.1.1] Đoạn về kiểm soát nội bộ đi quá sâu vào lý thuyết SoD

**Vị trí:** Mục 1.1.1 — phần "Thứ nhất, thiếu kiểm soát tài chính nội bộ"

**Vấn đề:** Đoạn này phân tích chi tiết cơ chế phân tách nhiệm vụ trong quy trình giấy tờ truyền thống ở mức lý thuyết thuộc Chương 5 (mục 5.1). Template quy định Chương 1 chỉ trình bày hiện trạng quan sát được ở tầng vĩ mô, không phân tích sâu vào cơ chế.

**Hướng sửa:** Rút gọn đoạn này xuống 2–3 câu mô tả hiện tượng thực tế quan sát được, rồi thêm câu chuyển tiếp: *"Vấn đề kiểm soát nội bộ này được phân tích chi tiết và đề xuất giải pháp trong mục 5.1."*

---

### 🟡 [1.3] Mâu thuẫn phiên bản Spring Boot

**Vị trí:** Mục 1.3 ghi *"Spring Boot 4.0.0-M3"*, trong khi tài liệu tham khảo [5] ghi *"Spring Boot Reference Documentation 3.4.x"*

**Vấn đề:** Hai phiên bản khác nhau xuất hiện xuyên suốt tài liệu. Nếu thực sự dùng 4.0.0-M3 (milestone, chưa release chính thức) cần xác nhận và đổi tài liệu tham khảo; nếu dùng 3.4.x thì sửa tất cả chỗ ghi "4.0.0-M3".

**Hướng sửa:** Thống nhất một phiên bản duy nhất xuyên suốt toàn bộ tài liệu.

---

## III. CHƯƠNG 2 — KHẢO SÁT VÀ PHÂN TÍCH YÊU CẦU

### 🔴 [2.1.3] Dùng gạch đầu dòng đánh số thứ tự trong văn bản chính

**Vị trí:** Mục 2.1.3 — danh sách sáu phân hệ cốt lõi đánh số 1–6

**Vấn đề:** Template nghiêm cấm dùng gạch đầu dòng hoặc đánh số thứ tự trong nội dung chính. Khi cần liệt kê, phải viết dạng *(i)..., (ii)..., (iii)...* trong câu văn hoặc thành đoạn văn đầy đủ.

**Hướng sửa:** Chuyển danh sách 6 phân hệ thành đoạn văn. Ví dụ: *"Từ phân tích nhu cầu người dùng và khoảng trống thị trường, đồ án xác định sáu phân hệ cốt lõi cần phát triển: (i) Phân hệ Quản lý nhân viên & Tổ chức, quản lý đầy đủ thông tin cá nhân, pháp lý và nghề nghiệp; (ii) Phân hệ Chấm công & Quản lý thời gian, tích hợp thiết bị nhận diện khuôn mặt qua API key; ..."*

---

### 🔴 [2.2] Hình vẽ Mermaid trong thẻ `<details>` — không hiển thị khi in

**Vị trí:** Tất cả biểu đồ use case (Hình 2.1 đến 2.10) hiện đặt trong thẻ `<details><summary>...</summary>`

**Vấn đề:** Đây là HTML collapsible — hiện đúng khi xem file `.md` trên trình duyệt nhưng khi xuất sang PDF/docx (quy trình nộp cuối cùng), các biểu đồ Mermaid sẽ không render hoặc không hiển thị. Template yêu cầu mọi hình vẽ xuất hiện trực tiếp trong văn bản.

**Hướng sửa:** Bỏ toàn bộ thẻ `<details>` và `<summary>`. Render các biểu đồ Mermaid thành ảnh PNG/SVG (dùng Mermaid Live Editor hoặc công cụ tương đương), chèn trực tiếp vào file LaTeX/docx. Đảm bảo mỗi hình có caption đúng định dạng bên dưới: *"Hình X.Y: Tên hình."*

---

### 🟡 [2.2.x] Chú thích kỹ thuật trong mô tả use case nên chuyển sang Chương 3/5

**Vị trí:** Các đoạn giải thích sau mỗi biểu đồ use case, ví dụ:
- Sau Hình 2.2: *"việc tạo nhân viên mới tạo đồng thời cả `EmployeeInfo` lẫn `UserAccount` trong một giao dịch nguyên tử..."*
- Sau Hình 2.3: *"Thiết kế event-driven qua `@TransactionalEventListener(AFTER_COMMIT)`..."*
- Sau Hình 2.9: *"Cơ chế trừ hai giai đoạn là điểm kỹ thuật then chốt..."*

**Vấn đề:** Chương 2 đặc tả chức năng từ góc độ nghiệp vụ, không giải thích kỹ thuật triển khai. Các giải thích về `@TransactionalEventListener`, `atomic transaction`, `two-stage deduction` thuộc Chương 4/5.

**Hướng sửa:** Thay mỗi đoạn giải thích kỹ thuật bằng một câu mô tả hành vi từ góc nhìn người dùng, kèm tham chiếu: *"Thiết kế kỹ thuật đảm bảo tính nhất quán của pipeline chấm công được trình bày chi tiết trong mục 5.2."*

---

### 🟡 [2.3] Mã API endpoint trong đặc tả use case không cần thiết

**Vị trí:** Bảng đặc tả use case (Bảng 2.2 đến 2.6) — một số bảng có tên endpoint cụ thể như `POST /api/checkin-logs`, `PATCH /submit`

**Vấn đề:** Đặc tả use case mô tả nghiệp vụ, không mô tả interface kỹ thuật. Tên endpoint là chi tiết triển khai thuộc Chương 4.

**Hướng sửa:** Bỏ tên endpoint khỏi bảng đặc tả use case. Mô tả hành động ở mức nghiệp vụ: thay `POST /api/checkin-logs` bằng *"Thiết bị gửi sự kiện check-in lên hệ thống"*.

---

## IV. CHƯƠNG 3 — NỀN TẢNG LÝ THUYẾT VÀ CÔNG NGHỆ

### 🟡 [3.x] Đoạn code nội tuyến cần có diễn giải ngay sau

**Vị trí:** Nhiều đoạn code Java trong Chương 3, ví dụ: `AuditableEntity` (mục 3.2.3), cấu hình `DeviceApiKeyFilter` (mục 3.2.2), cấu hình HikariCP (mục 3.3.1)

**Vấn đề:** Template quy định mọi hình vẽ, bảng biểu và code block phải được đề cập và giải thích trong văn bản. Một số đoạn code được đặt mà không có câu giải thích theo sau, hoặc giải thích nằm trước code block thay vì sau.

**Hướng sửa:** Đảm bảo mỗi code block có ít nhất một đoạn văn giải thích **ngay sau** block đó. Đoạn giải thích cần trả lời: đoạn code này làm gì, tại sao thiết kế như vậy.

---

### 🟡 [3] Kiểm tra độ dài Chương 3

**Vấn đề:** Template giới hạn Chương 3 tối đa **10 trang**. Chương hiện tại rất chi tiết với nhiều code block và sơ đồ — cần kiểm tra số trang thực tế sau khi xuất file.

**Hướng sửa:** Sau khi xuất file, đo số trang Chương 3. Nếu vượt 10 trang, ưu tiên chuyển vào Phụ lục: các code block cấu hình YAML đầy đủ (mục 3.3.1), sơ đồ ASCII chi tiết filter chain (mục 3.2.2), và mô tả pattern "three-file split" (mục 3.5.1).

---

### 🟢 [3.5.2] Đoạn xử lý response không nhất quán nên đặt ở Chương 4

**Vị trí:** Mục 3.5.2 — đoạn code về xử lý `Array.isArray(res.data)` vs `PageResponse<T>`

**Vấn đề:** Đây là chi tiết triển khai frontend cụ thể của dự án, không phải lý thuyết nền tảng về TypeScript. Nó phù hợp hơn với mục 4.3 (Xây dựng ứng dụng).

---

## V. CHƯƠNG 4 — PHÂN TÍCH THIẾT KẾ, TRIỂN KHAI VÀ ĐÁNH GIÁ

### 🔴 [4.x] Nội dung đóng góp trong Chương 4 bị lặp với Chương 5

**Vị trí:** Nhiều đoạn trong Chương 4, đặc biệt:
- Mục 4.1 (kiến trúc SoD 7 vai trò) → đã có Mục 5.1 nói chi tiết
- Mục 4.2.2 (thiết kế `PayrollCalculationEngine`) → đã có Mục 5.3
- Mục 4.2.2 (thiết kế `LeaveService` + pessimistic lock) → đã có Mục 5.4
- Mục 4.3 (pipeline `@TransactionalEventListener`) → đã có Mục 5.2

**Vấn đề:** Template quy định rõ: nội dung mang tính đóng góp chỉ được mô tả **sơ bộ** ở các chương trước và tạo tham chiếu chéo tới Chương 5. Chi tiết trình bày đầy đủ duy nhất ở Chương 5. Hiện tại nhiều đoạn ở Chương 4 giải thích kỹ thuật ở mức tương đương Chương 5, tạo ra nội dung trùng lặp.

**Hướng sửa — nguyên tắc chung:** Với mỗi đoạn giải thích kỹ thuật sâu trong Chương 4 liên quan đến bốn đóng góp chính, rút gọn xuống 2–3 câu mô tả kết quả/thiết kế rồi thêm câu: *"Chi tiết thiết kế và lập luận kỹ thuật được trình bày trong mục 5.X."*

**Ví dụ cụ thể:**

*Hiện tại (Chương 4, mô tả `@TransactionalEventListener`):*
> "Thiết kế event-driven qua `@TransactionalEventListener(AFTER_COMMIT)` đảm bảo `AttendanceService` chỉ xử lý sau khi `CheckinLog` đã được commit thành công..."

*Nên sửa thành:*
> "Pipeline chấm công được thiết kế theo hướng event-driven, đảm bảo tính nhất quán giữa raw log và bản ghi chấm công mà không cần message broker bên ngoài. Chi tiết kiến trúc và lý do lựa chọn được trình bày trong mục 5.2."

---

### 🔴 [4.3.3] Thiếu ảnh chụp màn hình thực tế của sản phẩm

**Vị trí:** Mục 4.3.3 — Minh họa các chức năng chính

**Vấn đề:** Template yêu cầu mục 4.3.3 phải có ảnh chụp màn hình thực tế của sản phẩm sau khi xây dựng, kèm lời giải thích ngắn gọn. Cần phân biệt với wireframe thiết kế ở mục 4.2.1 — đây phải là ảnh của sản phẩm **đang chạy thực tế**.

**Hướng sửa:** Bổ sung ảnh chụp màn hình (screenshot) của ít nhất 5–7 chức năng quan trọng nhất, mỗi ảnh có 2–3 câu giải thích. Ưu tiên: màn hình đăng nhập, dashboard theo từng vai trò, form chấm công, bảng lương DRAFT, màn hình phê duyệt của Director.

---

### 🟡 [4.5.2] Dùng gạch đầu dòng mô tả nội dung `DataInitializerConfig`

**Vị trí:** Mục 4.5.2 — danh sách ba dòng gạch đầu dòng mô tả những gì `DataInitializerConfig` tạo ra

**Hướng sửa:** Chuyển thành câu văn: *"`DataInitializerConfig` chạy một lần khi database rỗng, tạo tài khoản `admin` với vai trò SYSTEM_ADMIN, khởi tạo các bản ghi `SystemConfig` mặc định bao gồm biểu thuế PIT 7 bậc và tỷ lệ bảo hiểm, và tạo một số phòng ban mẫu để hỗ trợ thử nghiệm."*

---

## VI. CHƯƠNG 5 — GIẢI PHÁP VÀ ĐÓNG GÓP NỔI BẬT

### 🟡 [5.2.1] Tên hình dùng từ không phù hợp văn phong khoa học

**Vị trí:** Mục 5.2.1 — *"Hình 5.3: Vấn đề circular dependency khi thiết kế **ngây thơ**"*

**Vấn đề:** Từ "ngây thơ" là khẩu ngữ, không phù hợp văn phong khoa học.

**Hướng sửa:** Đổi thành *"Hình 5.3: Vấn đề circular dependency trong thiết kế ban đầu"* hoặc *"...trong thiết kế chưa tối ưu"*.

---

### 🟡 [5] Thiếu đoạn Kết chương

**Vị trí:** Cuối Chương 5

**Vấn đề:** Template yêu cầu mỗi chương (trừ Chương 1) phải có đoạn Kết chương tóm tắt nội dung đã trình bày và liên kết sang chương tiếp theo. Đoạn kết hiện tại (4 câu cuối trước dấu `---`) mang tính liệt kê lại hơn là tổng kết có chiều sâu, và chưa có câu liên kết sang Chương 6.

**Hướng sửa:** Bổ sung đoạn Kết chương khoảng 80–120 từ, tóm tắt ý nghĩa tổng hợp của bốn đóng góp (không chỉ liệt kê tên), và kết bằng câu liên kết: *"Tổng kết toàn bộ kết quả đạt được, đối sánh với các giải pháp tương tự, và lộ trình phát triển tiếp theo được trình bày trong Chương 6."*

---

## VII. CHƯƠNG 6 — KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

### 🔴 [6.2] Dùng nhiều gạch đầu dòng trong nội dung chính

**Vị trí:** Toàn bộ mục 6.2 — ba giai đoạn phát triển đều dùng bullet `- ...`

**Vấn đề:** Đây là vi phạm quy định về hình thức còn tồn tại nhiều nhất trong đồ án. Mục 6.2 hiện gần như toàn bộ là gạch đầu dòng.

**Hướng sửa:** Chuyển toàn bộ nội dung mục 6.2 thành đoạn văn. Mỗi giai đoạn phát triển viết thành một đoạn, các hạng mục ưu tiên viết theo dạng *(i)..., (ii)..., (iii)...* trong câu.

**Ví dụ:**

*Hiện tại:*
> *Ưu tiên cao — cần trước khi production deployment:*
> - Xóa `JWT_SECRET` default yếu...

*Nên sửa thành:*
> "Giai đoạn 1 tập trung vào hardening và hoàn thiện trước khi triển khai production, với bốn hạng mục ưu tiên cao: (i) xóa giá trị mặc định yếu của `JWT_SECRET` và thêm kiểm tra fail-fast khi khởi động; (ii) chuyển `PayrollJobStore` sang database-backed để hỗ trợ restart và multi-instance deployment; (iii) migrate lưu trữ ảnh sang MinIO hoặc S3-compatible object storage; và (iv) thêm JSON schema validation cho `SystemConfig` trước khi lưu."

---

### 🔴 [6.2] Hình 6.1 dùng ASCII art — không phù hợp với file cuối

**Vị trí:** Mục 6.2 — *"Hình 6.1: Lộ trình phát triển FaceZ HRMS"* hiện là sơ đồ ASCII thuần túy

**Vấn đề:** Trong file LaTeX/docx cuối cùng, ASCII art sẽ không render đẹp và không đúng định dạng hình vẽ chuẩn ĐATN.

**Hướng sửa:** Vẽ lại lộ trình dưới dạng hình vẽ thực sự (timeline diagram, có thể dùng Mermaid gantt chart hoặc draw.io), xuất ra ảnh và chèn vào file với caption đúng định dạng.

---

### 🟡 [6.1.2] Danh sách kết quả kỹ thuật dùng gạch đầu dòng

**Vị trí:** Mục 6.1.2, phần "Về mặt kỹ thuật, hệ thống đạt được" — danh sách 6 dòng gạch đầu dòng

**Hướng sửa:** Chuyển thành câu văn: *"Về mặt kỹ thuật, hệ thống bao gồm hơn 65 REST endpoint phủ đầy đủ chín domain nghiệp vụ, 19 Flyway migration quản lý toàn bộ lịch sử schema, và đạt tỷ lệ 45/45 test case pass. Về hiệu suất, thời gian phản hồi API trung bình dưới 100ms và thời gian tính lương batch 100 nhân viên dưới 3 giây."*

---

### 🟢 [6] Câu kết đồ án mang tính tự đánh giá quá

**Vị trí:** Câu cuối cùng của Chương 6 — *"FaceZ HRMS là minh chứng rằng một hệ thống quản lý nhân sự hoàn chỉnh... hoàn toàn có thể được xây dựng trong phạm vi một đồ án tốt nghiệp."*

**Hướng sửa:** Thay bằng câu tổng kết hướng về tương lai, ví dụ: *"Đồ án này tạo ra một nền tảng kỹ thuật hoàn chỉnh và có thể kiểm chứng, mở ra các hướng phát triển thực tiễn theo lộ trình đã trình bày trong mục 6.2."*

---

## VIII. TÀI LIỆU THAM KHẢO

### 🟡 Thiếu thông tin "visited on" cho tài liệu online

**Vị trí:** Tài liệu tham khảo [5] đến [15] và [20]

**Vấn đề:** Template SOICT yêu cầu tài liệu tham khảo dạng Internet phải có ngày truy cập cuối theo định dạng *(visited on DD/MM/YYYY)*.

**Hướng sửa:** Bổ sung ngày truy cập cho tất cả tài liệu online. Ví dụ: `[5] Spring Framework Team, Spring Boot Reference Documentation 3.4.x, ... [Online]. Available: https://... (visited on 15/05/2026).`

---

### 🔴 Tài liệu tham khảo pháp lý cần cập nhật

**Vị trí:** [3] — *"Nghị định 38/2022/NĐ-CP quy định mức lương tối thiểu vùng"*

**Vấn đề:** Nghị định 38/2022 đã được thay thế bởi Nghị định 74/2024/NĐ-CP (áp dụng từ 01/07/2024). Trích dẫn văn bản đã hết hiệu lực mà không ghi chú là không chính xác về mặt pháp lý.

**Hướng sửa:** Cập nhật thành *"Chính phủ Việt Nam, Nghị định 74/2024/NĐ-CP quy định mức lương tối thiểu vùng, Hà Nội, 2024."*

---

### 🟡 Bổ sung tài liệu tham khảo cho số liệu thống kê ở Chương 1

**Vấn đề:** Các số liệu thống kê trong Chương 1 (số doanh nghiệp công nghệ, số nhân lực CNTT) hiện không có trích dẫn nguồn cụ thể nào trong danh sách tài liệu tham khảo.

**Hướng sửa:** Thêm 1–2 tài liệu tham khảo cho số liệu từ VINASA hoặc Bộ TT&TT, và thêm `\cite{}` tương ứng vào các câu dẫn số liệu trong Chương 1.

---

## IX. CÁC VẤN ĐỀ HÌNH THỨC TOÀN ĐỒ ÁN

### 🔴 Gạch đầu dòng còn xuất hiện nhiều nơi

**Danh sách các vị trí cần chuyển sang đoạn văn:**

| Vị trí | Nội dung cần sửa |
|---|---|
| Mục 1.2.2 "Phạm vi tính năng" | Danh sách 8 dòng gạch đầu dòng các tính năng |
| Mục 1.2.2 "Ngoài phạm vi" | Danh sách 5 dòng gạch đầu dòng |
| Mục 2.1.1 (mô tả nhóm người dùng) | Các đoạn bắt đầu bằng `\-` |
| Mục 6.1.2 "Kết quả đạt được" | Danh sách 6 chỉ số kỹ thuật |
| Mục 6.2 toàn bộ | Ba giai đoạn phát triển |

**Nguyên tắc áp dụng:** Mọi danh sách dạng gạch đầu dòng (`-`) hoặc đánh số thứ tự (`1. 2. 3.`) trong nội dung văn bản chính đều cần chuyển thành *(i), (ii), (iii)...* nằm trong câu văn đầy đủ.

---

### 🟡 Tổng quan và Kết chương cần kiểm tra đầy đủ

| Chương | Tổng quan | Kết chương |
|---|:---:|:---:|
| Chương 2 | ✅ Có | ✅ Có |
| Chương 3 | ✅ Có | 🟡 Cần kiểm tra — kết thúc khá đột ngột sau mục 3.6 |
| Chương 4 | ✅ Có | ✅ Có (cuối mục 4.5.3) |
| Chương 5 | ✅ Có | 🔴 Cần bổ sung — xem mục VI |
| Chương 6 | ✅ Có | Không cần (chương cuối) |

---

## X. CHECKLIST TỔNG HỢP TRƯỚC KHI NỘP

| # | Hạng mục | Mức độ | Hoàn thành |
|---|---|:---:|:---:|
| 1 | Sửa số liệu 35.000 → 75.000 doanh nghiệp công nghệ + bổ sung nguồn trích dẫn | 🔴 | ☐ |
| 2 | Điều chỉnh nhận định về MISA HRM (API sai thực tế) | 🔴 | ☐ |
| 3 | Điều chỉnh nhận định về Base HR | 🔴 | ☐ |
| 4 | Cập nhật/đóng khung số liệu giảm trừ gia cảnh (11tr/4,4tr → 15,5tr/6,2tr từ 2026) | 🔴 | ☐ |
| 5 | Cập nhật tài liệu tham khảo Nghị định lương tối thiểu (38/2022 → 74/2024) | 🔴 | ☐ |
| 6 | Thống nhất phiên bản Spring Boot xuyên suốt toàn bộ tài liệu | 🔴 | ☐ |
| 7 | Rút gọn mục 1.3 — chuyển chi tiết kỹ thuật sang Chương 3 | 🔴 | ☐ |
| 8 | Rút gọn đoạn SoD ở mục 1.1.1 + thêm tham chiếu sang mục 5.1 | 🔴 | ☐ |
| 9 | Render tất cả biểu đồ Mermaid thành ảnh, bỏ toàn bộ thẻ `<details>` | 🔴 | ☐ |
| 10 | Rút gọn nội dung đóng góp trong Chương 4 thành tham chiếu sang Chương 5 | 🔴 | ☐ |
| 11 | Bổ sung ảnh chụp màn hình thực tế ở mục 4.3.3 | 🔴 | ☐ |
| 12 | Chuyển toàn bộ mục 6.2 từ gạch đầu dòng sang đoạn văn | 🔴 | ☐ |
| 13 | Vẽ lại Hình 6.1 lộ trình thành hình vẽ thực sự (không dùng ASCII art) | 🔴 | ☐ |
| 14 | Chuyển mục 1.2.2 (phạm vi tính năng) từ gạch đầu dòng sang đoạn văn | 🔴 | ☐ |
| 15 | Chuyển danh sách phân hệ ở mục 2.1.3 thành đoạn văn | 🔴 | ☐ |
| 16 | Bổ sung Kết chương cho Chương 5 | 🟡 | ☐ |
| 17 | Bỏ tên API endpoint khỏi bảng đặc tả use case | 🟡 | ☐ |
| 18 | Bỏ chú thích kỹ thuật sau biểu đồ use case, thêm tham chiếu sang Chương 5 | 🟡 | ☐ |
| 19 | Thêm "visited on" cho tất cả tài liệu tham khảo online | 🟡 | ☐ |
| 20 | Bổ sung tài liệu tham khảo cho số liệu thống kê Chương 1 | 🟡 | ☐ |
| 21 | Sửa tên Hình 5.3 (bỏ từ "ngây thơ") | 🟡 | ☐ |
| 22 | Sửa câu cuối Lời cảm ơn | 🟡 | ☐ |
| 23 | Sửa trần BHXH (20 lần lương cơ sở, phân biệt với BHTN) | 🟡 | ☐ |
| 24 | Kiểm tra độ dài Chương 3 ≤ 10 trang sau khi xuất file | 🟡 | ☐ |
| 25 | Chuyển danh sách kết quả kỹ thuật ở mục 6.1.2 thành đoạn văn | 🟡 | ☐ |
| 26 | Kiểm tra và bổ sung Kết chương Chương 3 | 🟡 | ☐ |
| 27 | Đảm bảo mọi code block có đoạn giải thích ngay sau trong Chương 3 | 🟡 | ☐ |
| 28 | Sửa câu kết đồ án (câu cuối Chương 6) | 🟢 | ☐ |
| 29 | Chuyển đoạn xử lý response TypeScript từ mục 3.5.2 sang mục 4.3 | 🟢 | ☐ |

---

*Tài liệu này được tổng hợp dựa trên đối chiếu với template SOICT ĐATN (ISO 7144:1986) và tài liệu mẫu tham khảo (ĐATN Nguyễn Chí Quân — Hệ thống Apex, 06/2026).*
