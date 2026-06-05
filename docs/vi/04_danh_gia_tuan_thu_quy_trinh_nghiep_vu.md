# FaceZ HRMS — Đánh Giá Tuân Thủ Quy Trình Nghiệp Vụ
### Đánh Giá Tính Đúng Đắn Của Vai Trò Tổ Chức và Quyền Sở Hữu Quy Trình
**Phiên bản:** 1.0 | **Ngày:** 10-04-2026 | **Người phân tích:** Claude Code

---

## 1. Mục Đích và Phương Pháp Tiếp Cận

Tài liệu này đánh giá FaceZ từ góc độ **quyền sở hữu quy trình nghiệp vụ**. Câu hỏi cốt lõi không phải là phần mềm có hoạt động về mặt kỹ thuật hay không, mà là liệu nó có ánh xạ đúng với cách một công ty công nghệ thực sự được tổ chức và vận hành hay không.

Bối cảnh rất quan trọng: hệ thống này nhằm mục đích số hóa các quy trình trước đây diễn ra trên giấy tờ hoặc bảng tính, được quản lý bởi các bộ phận tổ chức riêng biệt — Nhân sự, Kế toán/Tài chính và Ban Quản lý. Một dự án số hóa kết hợp sai các chức năng này vào một vai trò duy nhất, hoặc bỏ sót hoàn toàn một chức năng, không đơn giản hóa tổ chức — mà tạo ra sự nhầm lẫn, loại bỏ trách nhiệm giải trình và đưa vào những lỗi kiểm soát mà hệ thống dựa trên giấy tờ không có.

Phân tích dưới đây xem xét từng lĩnh vực nghiệp vụ, xác định bộ phận tổ chức nào nên sở hữu nó, mô tả quy trình dựa trên giấy tờ trông như thế nào, sau đó đánh giá xem thiết kế hiện tại của hệ thống có hỗ trợ hay làm suy yếu quy trình đó không.

---

## 2. Các Chức Năng Tổ Chức Liên Quan đến HRMS

Trước khi đánh giá hệ thống, cần nêu rõ những chức năng tồn tại trong một công ty công nghệ điển hình và trách nhiệm của từng chức năng trong bối cảnh các quy trình liên quan đến HR.

### 2.1 Bộ Phận Nhân Sự (HR)

HR chịu trách nhiệm về **quan hệ lao động** giữa công ty và nhân viên. Điều này bao gồm:

- Tuyển dụng, tiếp nhận và thôi việc nhân viên.
- Duy trì hồ sơ nhân viên (dữ liệu cá nhân, lịch sử việc làm, điều khoản hợp đồng).
- Quản lý quyền lợi nghỉ phép và thực thi chính sách nghỉ phép.
- Quản lý quy trình kỷ luật và khiếu nại.
- Đảm bảo tuân thủ Bộ Luật Lao động (giờ làm việc, định mức nghỉ phép, loại hợp đồng).
- Thu thập dữ liệu đầu vào cần thiết cho tính lương (dữ liệu chấm công, nghỉ phép, tăng ca, đánh giá KPI).
- **Chuẩn bị** dữ liệu đầu vào cho Kế toán xử lý — nhưng **không tính lương**.

HR sở hữu vòng đời nhân viên. HR **không** sở hữu tính lương, khấu trừ thuế hay nộp bảo hiểm. Đó là nghĩa vụ tài chính.

### 2.2 Bộ Phận Kế Toán / Tài Chính

Kế toán chịu trách nhiệm về hồ sơ tài chính và nghĩa vụ pháp lý của công ty. Trong bối cảnh các quy trình liên quan đến HR, Kế toán sở hữu:

- **Tính lương gộp và lương thực nhận** từ dữ liệu đầu vào của HR (chấm công, nghỉ phép/tăng ca đã duyệt, điểm KPI).
- **Tính các khoản khấu trừ bắt buộc**: BHXH, BHYT, BHTN (cả phần nhân viên và người sử dụng lao động) và Thuế Thu Nhập Cá Nhân.
- **Nộp đóng góp bảo hiểm** cho Cơ quan Bảo hiểm Xã hội (hàng tháng, dựa trên danh sách nhân viên đã đăng ký và khai báo lương).
- **Nộp thuế TNCN** cho Cơ quan Thuế (tạm nộp hàng tháng, quyết toán cuối năm).
- **Ghi bút toán lương** vào Sổ Cái (nợ: tài khoản chi phí nhân công; có: phải trả nhân viên, phải trả cơ quan bảo hiểm, phải trả cơ quan thuế).
- **Tạo file chuyển khoản ngân hàng** để chi lương.
- **Chuẩn bị báo cáo chi phí** cho thấy chi phí lao động theo phòng ban, dự án hoặc trung tâm chi phí.
- Cấp **chứng từ thuế TNCN** cho nhân viên hàng năm (Mẫu 05-1/BK-TNCN ở Việt Nam).

Kế toán **không** phê duyệt hoặc sửa đổi bản ghi chấm công, đơn nghỉ phép hay hợp đồng lao động.

### 2.3 Ban Quản Lý (Trưởng phòng, Giám đốc)

Ban Quản lý chịu trách nhiệm về **các quyết định kinh doanh** liên quan đến nhóm của họ. Trong bối cảnh quy trình HR, điều này bao gồm:

- Phê duyệt hoặc từ chối đơn nghỉ phép và tăng ca.
- Cung cấp đánh giá KPI cho nhân viên trực tiếp dưới quyền.
- Xem xét và phê duyệt **chi phí lương** của phòng ban (với tư cách chủ ngân sách) trước khi chi trả cuối cùng.
- Phê duyệt thăng chức và thay đổi hợp đồng ảnh hưởng đến lương (mà HR sau đó ghi vào hệ thống).

Ban Quản lý **không** tính lương, ghi bút toán kế toán hay quản lý dữ liệu cá nhân nhân viên trực tiếp.

### 2.4 Giám Đốc / Ban Lãnh Đạo Công Ty

Ở cấp toàn công ty, lãnh đạo chịu trách nhiệm:

- Phê duyệt lần chạy lương tháng (ký duyệt cuối trước khi chuyển khoản ngân hàng).
- Phê duyệt thay đổi lương đáng kể, bậc vị trí mới và cập nhật chính sách lương thưởng.
- Xem xét tổng chi phí lao động so với ngân sách.

---

## 3. Kiến Trúc Vai Trò Trong Hệ Thống Hiện Tại So Với Thực Tế

### 3.1 Hệ Thống Hiện Có

Hệ thống định nghĩa năm vai trò:

| Vai trò        | Phạm vi trong hệ thống                                              |
|----------------|---------------------------------------------------------------------|
| `SYSTEM_ADMIN` | Cấu hình hệ thống (khung thuế, bảng lương, tỷ lệ bảo hiểm)         |
| `HR_ADMIN`     | CRUD nhân viên, hợp đồng, **tính lương**, **phê duyệt lương**       |
| `MANAGER`      | Phê duyệt nghỉ phép/tăng ca cấp 2, xem thông tin nhóm              |
| `LEADER`       | Phê duyệt cấp 1 nghỉ phép và tăng ca                               |
| `EMPLOYEE`     | Xem dữ liệu của mình, nộp đơn nghỉ phép/tăng ca                    |

### 3.2 Vấn Đề Cốt Lõi

Vai trò `HR_ADMIN` được giao trách nhiệm thuộc về **ba bộ phận tổ chức khác nhau**:

| Nhiệm vụ hiện giao cho HR_ADMIN                 | Bộ phận thực sự sở hữu          |
|-------------------------------------------------|----------------------------------|
| Quản lý hồ sơ nhân viên                        | HR ✓ (đúng)                     |
| Phê duyệt cuối nghỉ phép và tăng ca            | HR ✓ (đúng)                     |
| Tạo và duy trì hợp đồng lao động               | HR ✓ (đúng)                     |
| **Tính lương (lương gộp, khấu trừ, TNCN, thực nhận)** | **Kế toán** ✗           |
| **Phê duyệt lương (ủy quyền chi trả)**         | **Giám đốc Tài chính / Giám đốc** ✗ |
| **Cấu hình hệ thống (khung thuế, tỷ lệ BH, bảng lương)** | **Kế toán / SYSTEM_ADMIN gần đúng nhưng nội dung là công việc kế toán** |

Vai trò `SYSTEM_ADMIN` được hiểu là vai trò quản trị kỹ thuật. Tuy nhiên, nội dung của bảng lương, bậc thuế TNCN và tỷ lệ bảo hiểm là kiến thức kế toán, và chủ sở hữu nghiệp vụ của dữ liệu đó phải là người trong Kế toán/Tài chính — không phải quản trị viên hệ thống.

### 3.3 Thất Bại Phân Tách Nhiệm Vụ

Trong bất kỳ môi trường kiểm soát tài chính lành mạnh nào, các nhiệm vụ sau phải được phân tách:

1. **Nhập dữ liệu lương** (HR: chấm công, nghỉ phép, tăng ca)
2. **Tính lương** (Kế toán)
3. **Ủy quyền/phê duyệt thanh toán** (Giám đốc Tài chính hoặc Giám đốc Công ty)
4. **Thực hiện thanh toán** (chuyển khoản ngân hàng, chức năng kho quỹ riêng)

Hệ thống hiện tại gộp nhiệm vụ 1, 2 và 3 vào một người dùng `HR_ADMIN` duy nhất. Cùng một người ghi nhân viên làm 26 ngày cũng có thể tính lương, sau đó phê duyệt để chi trả. Đây là thất bại kiểm soát nội bộ điển hình, và đây chính xác là loại kiểm soát mà các quy trình dựa trên giấy tờ — với chữ ký vật lý từ nhiều người được ủy quyền — được thiết kế để ngăn chặn.

**Nỗ lực số hóa đã loại bỏ kiểm soát tài chính thay vì bảo toàn nó.**

---

## 4. Đánh Giá Quy Trình Nghiệp Vụ Theo Từng Lĩnh Vực

---

### 4.1 Quản Lý Nhân Viên

**Chủ sở hữu nghiệp vụ:** Nhân Sự

**Quy trình dựa trên giấy tờ:**
Hồ sơ nhân viên mới (giấy tờ tùy thân, hợp đồng lao động đã ký, mẫu tài khoản ngân hàng, đăng ký thuế, tờ khai người phụ thuộc) được HR thu thập, lưu vào hồ sơ nhân sự và đăng ký với cơ quan Bảo hiểm Xã hội và Cơ quan Thuế.

**Hành vi hệ thống hiện tại:**
HR_ADMIN tạo hồ sơ nhân viên và thông tin đăng nhập. Hệ thống ghi lại tên, thông tin liên hệ, phòng ban, vai trò và liên hệ khẩn cấp.

**Đánh giá: Đúng một phần, thiếu nhiều thành phần.**

Điều đúng:
- HR sở hữu quy trình này trong hệ thống, điều đó là đúng.
- Các trường dữ liệu (tên, email, điện thoại, phòng ban) là dữ liệu HR phù hợp.

Điều còn thiếu:

| Dữ liệu/Quy trình còn thiếu | Tác động nghiệp vụ |
|-----------------------------|---------------------|
| Số CCCD / CMND | Bắt buộc để đăng ký BHXH; nhân viên không thể đăng ký chính thức nếu không có |
| Số tài khoản ngân hàng | Bắt buộc để chuyển lương; hiện không có chỗ lưu trong hệ thống |
| Mã số thuế cá nhân (MST cá nhân) | Bắt buộc cho báo cáo TNCN; mỗi nhân viên phải có mã số thuế cá nhân |
| Số sổ BHXH | Bắt buộc cho báo cáo đóng BHXH |
| Tờ khai người phụ thuộc (Mẫu 02/CK-TNCN) | Hệ thống ghi `dependentCount` dưới dạng số, nhưng không có hồ sơ về danh tính người phụ thuộc, CCCD của họ hay việc đã nộp tờ khai chưa |
| Trạng thái ký hợp đồng | Hợp đồng được lưu nhưng không có quy trình ký, xác nhận hay theo dõi tài liệu vật lý |
| Không có nguồn tuyển dụng hoặc thời gian thử việc | Dữ liệu HR phổ biến cho phân tích lực lượng lao động và quản lý loại hợp đồng |

**Kết luận:** Hệ thống giao đúng quyền sở hữu HR cho quản lý nhân viên nhưng chỉ triển khai một tập con mỏng của dữ liệu mà hệ thống HR cần nắm bắt. Đặc biệt, một số trường mà Kế toán cần để tuân thủ pháp lý (mã số thuế, mã BHXH, tài khoản ngân hàng) đang thiếu.

---

### 4.2 Cơ Cấu Phòng Ban và Tổ Chức

**Chủ sở hữu nghiệp vụ:** Nhân Sự / Ban Quản Lý

**Quy trình dựa trên giấy tờ:**
Sơ đồ tổ chức được HR duy trì và Giám đốc phê duyệt. Trưởng bộ phận được chính thức bổ nhiệm bằng văn bản quyết định.

**Hành vi hệ thống hiện tại:**
HR_ADMIN tạo phòng ban và gán trưởng phòng trực tiếp.

**Đánh giá: Chấp nhận được với công ty nhỏ, nhưng cơ cấu quá phẳng.**

Hệ thống chỉ hỗ trợ **danh sách phòng ban phẳng** không có phân cấp. Một công ty công nghệ có thể có các đơn vị kinh doanh chứa nhiều phòng ban, hoặc các phòng ban với nhóm con. Quan trọng hơn:
- "Trưởng phòng" của một phòng ban trong hệ thống là một trường FK duy nhất — không có khái niệm quyền trưởng phòng tạm thời, cấp phó hay gán trưởng phòng lịch sử.
- Không có quy trình phê duyệt chính thức cho thay đổi tổ chức (bất kỳ HR_ADMIN nào cũng có thể gán lại phòng ban ngay lập tức).
- Endpoint phòng ban có thể truy cập công khai không cần xác thực, làm lộ cơ cấu tổ chức của công ty.

---

### 4.3 Quản Lý Chấm Công

**Chủ sở hữu nghiệp vụ:** Nhân Sự (theo dõi) + Kế Toán (đầu vào cho tính lương)

**Quy trình dựa trên giấy tờ:**
Chấm công thường được theo dõi qua bảng ký tên hoặc hệ thống quẹt thẻ. Cuối tháng, HR tổng hợp bảng chấm công tháng cho mỗi nhân viên (ngày làm việc, ngày vắng, đến trễ, tăng ca). Bảng tóm tắt này là **tài liệu đầu vào tính lương** mà HR chuyển cho Kế toán.

**Hành vi hệ thống hiện tại:**
Hệ thống ghi lại sự kiện check-in/out thô (`CheckinLog`) từ thiết bị. Bản ghi `Attendance` đã xử lý được cho là sẽ tính từ các nhật ký này, nhưng bước này **chưa được tự động hóa** — nó thủ công. HR cần kích hoạt tính toán chấm công cho từng nhân viên, hoặc không có dữ liệu chấm công đã xử lý nào cả.

**Đánh giá: Quyền sở hữu quy trình đúng (HR), nhưng triển khai chưa hoàn chỉnh và có rủi ro tạo dữ liệu đầu vào tính lương sai.**

Các vấn đề:

| Vấn đề | Tác động nghiệp vụ |
|--------|---------------------|
| Pipeline check-in → Chấm công chưa tự động | Bộ máy tính lương nhận dữ liệu chấm công bằng 0 trừ khi HR xử lý thủ công từng nhân viên |
| Giờ bắt đầu cố định 08:30 | Không phục vụ được công ty giờ linh hoạt, lao động theo ca hay chính sách nhiều địa điểm |
| Không có quản lý ca | Không xử lý được nhân viên theo ca sáng, chiều hay đêm với lịch trình khác nhau |
| Không phân loại vắng mặt | Hệ thống biết nhân viên không check-in, nhưng không phân biệt được giữa nghỉ phép đã duyệt, nghỉ ốm, vắng mặt không phép hay ngày lễ |
| Ngày lễ không được quản lý | Làm việc ngày lễ có hệ số OT khác (×3,0 ở Việt Nam), nhưng hệ thống không có lịch ngày lễ |
| Không có bảng chấm công tháng để HR ký duyệt | Trong quy trình giấy tờ, trưởng HR ký vật lý vào bảng chấm công tóm tắt trước khi chuyển sang Kế toán. Không có quy trình tương đương trong hệ thống. |

Việc đối chiếu vắng mặt với đơn nghỉ phép đã duyệt đặc biệt quan trọng: nếu nhân viên có đơn nghỉ đã duyệt nhưng cũng không có bản ghi chấm công cho ngày đó, hệ thống hiện tại xử lý cả hai riêng biệt — nó không đối chiếu để xác định đúng vắng mặt có lương hay không lương.

---

### 4.4 Quản Lý Nghỉ Phép

**Chủ sở hữu nghiệp vụ:** Nhân Sự (chính sách, hồ sơ) + Ban Quản Lý (phê duyệt)

**Quy trình dựa trên giấy tờ:**
Nhân viên điền đơn xin nghỉ phép, quản lý trực tiếp ký, trưởng phòng ký phụ lục, và HR đóng dấu/phê duyệt bản cuối. HR ghi nghỉ phép vào hồ sơ cá nhân nhân viên và cập nhật sổ theo dõi số ngày phép. Khấu trừ lương cho nghỉ không lương (nếu vượt số dư) được thông báo cho Kế toán.

**Hành vi hệ thống hiện tại:**
Phê duyệt ba cấp (LEADER → MANAGER → HR_ADMIN). Đơn nghỉ phép được lưu và theo dõi trạng thái.

**Đánh giá: Phân cấp phê duyệt được mô hình hóa đúng, nhưng hệ thống quản lý nghỉ phép thiếu hai tính năng quan trọng nhất.**

**Vấn đề 1: Không phân loại loại nghỉ phép.**
Bộ Luật Lao Động Việt Nam 2019 quy định các loại nghỉ phép riêng biệt với quyền lợi cụ thể:

| Loại Nghỉ Phép | Quyền Lợi Theo Luật |
|---|---|
| Nghỉ phép năm | 12–16 ngày/năm tùy thâm niên và điều kiện làm việc |
| Nghỉ ốm | Được BHXH trả (tối đa 30–75 ngày/năm) |
| Nghỉ thai sản | 6 tháng cho mẹ; 5–14 ngày cho cha |
| Nghỉ tang | 3 ngày |
| Nghỉ cưới | 3 ngày |
| Nghỉ lễ | 11 ngày/năm |
| Nghỉ không lương | Theo thỏa thuận |

Hệ thống có một loại "đơn nghỉ phép" không phân biệt. Không thể áp dụng định mức, tạo báo cáo theo quy định hay thông báo cho Kế toán vắng mặt nào dẫn đến khấu trừ lương.

**Vấn đề 2: Không theo dõi số dư phép.**
Nếu không có số dư phép, hệ thống không thể cho HR biết nhân viên còn phép năm hay không, liệu nghỉ ốm có cần nộp cho BHXH để hoàn trả không, hay vắng mặt có cần khấu trừ không lương không. Đây là chức năng chính của sổ theo dõi phép giấy.

---

### 4.5 Quản Lý Tăng Ca

**Chủ sở hữu nghiệp vụ:** Ban Quản Lý (phê duyệt) + HR (hồ sơ) + Kế Toán (tính lương)

**Quy trình dựa trên giấy tờ:**
Quản lý nộp mẫu ủy quyền tăng ca cho nhóm trước khi tăng ca diễn ra, hoặc nhân viên nộp mẫu xác nhận sau khi làm thêm giờ. HR kiểm tra đối chiếu với giới hạn pháp lý (tối đa 40 giờ OT/tháng, 200 giờ/năm hoặc 300 giờ trong điều kiện cụ thể theo Bộ Luật Lao Động). Bảng tóm tắt OT đã duyệt được chuyển cho Kế toán như dữ liệu đầu vào tính lương.

**Hành vi hệ thống hiện tại:**
Đơn tăng ca giống quy trình nghỉ phép (nhân viên nộp, phê duyệt ba cấp). Đơn đã duyệt được bộ máy tính lương sử dụng với hệ số nhân.

**Đánh giá: Quy trình phê duyệt đúng về cấu trúc, nhưng thiếu các ràng buộc pháp lý quan trọng và bối cảnh quy trình.**

Các vấn đề:

| Vấn đề | Tác động nghiệp vụ |
|--------|---------------------|
| Không áp dụng giới hạn OT | Bộ Luật Lao Động giới hạn OT 40 giờ/tháng và 200 giờ/năm (hoặc 300 theo chương trình đặc biệt). Hệ thống không kiểm tra các giới hạn này. Nhân viên có thể tích lũy đơn OT không giới hạn. |
| Đơn OT do nhân viên nộp, không phải quản lý | Thực tế, OT được quản lý ủy quyền trước hoặc trong khi làm, không phải do nhân viên yêu cầu sau đó. Quy trình nên cho phép quản lý tạo bản ghi OT cho nhóm. |
| Không phân biệt ủy quyền trước và xác nhận sau | Không có sự khác biệt giữa "tôi dự kiến làm OT" (phê duyệt trước) và "tôi đã làm OT và đang xác nhận" (xác nhận sau). |
| Phân loại ca đêm không dựa trên giờ thực tế | Hệ số ×1,3 ca đêm được đề cập trong bộ máy tính lương nhưng logic phân loại dựa trên thời gian bắt đầu/kết thúc đơn. Hệ thống không xác thực đơn có thực sự rơi vào khung 22:00–06:00 không. |

---

### 4.6 Tính Lương

**Chủ sở hữu nghiệp vụ: Kế Toán / Tài Chính**

Đây là sự lệch lạc nghiêm trọng nhất trong toàn bộ hệ thống.

**Quy trình dựa trên giấy tờ:**
1. Cuối tháng, HR chuẩn bị và chuyển cho Kế toán: bảng chấm công có chữ ký (số ngày làm việc mỗi nhân viên), sổ nghỉ phép đã duyệt, các mẫu ủy quyền tăng ca đã duyệt và thông báo thay đổi lương (thăng chức, tuyển mới, thôi việc).
2. Kế toán sử dụng các tài liệu này, cùng với bảng lương hiện hành và tỷ lệ pháp lý, để tính lương gộp, khấu trừ và lương thực nhận cho mỗi nhân viên. Việc này được thực hiện trên bảng tính hoặc phần mềm lương do Kế toán kiểm soát.
3. Kế toán trưởng xem xét và ký vào bảng lương.
4. Bảng lương được trình lên Giám đốc Tài chính (hoặc Giám đốc Công ty) để phê duyệt.
5. Giám đốc ký bảng lương, ủy quyền chuyển khoản ngân hàng.
6. Kế toán chuẩn bị file chuyển khoản ngân hàng và gửi ngân hàng.
7. Kế toán ghi bút toán lương vào Sổ Cái.
8. Kế toán nộp đóng góp BHXH/BHYT/BHTN cho Cơ quan BHXH và thuế TNCN cho Cơ quan Thuế.

**Hành vi hệ thống hiện tại:**
`HR_ADMIN` gọi endpoint tính lương trực tiếp. Hệ thống tính lương gộp, tất cả khấu trừ và lương thực nhận. `HR_ADMIN` sau đó phê duyệt bảng lương.

**Đánh giá: Chức năng nghiệp vụ bị giao hoàn toàn sai.**

Vấn đề không chỉ là hình thức (gọi người dùng là "HR" thay vì "Kế toán"). Thiết kế quy trình có hậu quả thực sự:

**Hậu quả 1 — Phân tách nhiệm vụ bị phá vỡ.**
Người nhập dữ liệu chấm công (HR) là người tính lương (lẽ ra phải là Kế toán) và phê duyệt thanh toán (lẽ ra phải là Giám đốc). Một người dùng HR_ADMIN, không cần ai khác tham gia, có thể tạo nhân viên, sửa bản ghi chấm công, tính và phê duyệt bảng lương, rồi đánh dấu đã trả. Đây là thất bại kiểm soát nội bộ điển hình, tạo điều kiện cho gian lận lương.

**Hậu quả 2 — Đầu vào và đầu ra tính lương không được tách biệt như tài liệu nghiệp vụ.**
Trong quy trình đúng, HR tạo **tài liệu đầu vào** (bảng tóm tắt chấm công và nghỉ phép) và Kế toán tạo **tài liệu đầu ra** (bảng lương). Đây là các tài liệu riêng biệt với chủ sở hữu và chữ ký riêng. Hệ thống gộp chúng thành một bước tính toán duy nhất không có bàn giao giữa các chức năng.

**Hậu quả 3 — Kế toán không có vai trò trong hệ thống.**
Không có vai trò `ACCOUNTANT`. Bộ phận Kế toán — chịu trách nhiệm pháp lý về báo cáo thuế lương, nộp bảo hiểm và ghi Sổ Cái — không có mặt trong hệ thống. Sau khi bảng lương được "đánh dấu đã trả," hệ thống không có quy trình tiếp theo. Việc nộp thuế thực tế, khai báo bảo hiểm, quyết toán TNCN và ghi bút toán đều xảy ra ngoài hệ thống, tái tạo đúng công việc thủ công giấy tờ mà hệ thống được cho là thay thế.

**Hậu quả 4 — Chi phí phía sử dụng lao động không thấy được.**
Bộ máy tính lương chỉ tính khấu trừ phía nhân viên. Đóng góp của người sử dụng lao động (BHXH: 17%, BHYT: 3%, BHTN: 1%, TNLĐ-BNN: 0,5% — tổng cộng 21,5% lương đóng bảo hiểm) không được tính ở đâu. Bộ phận Kế toán không thể xem tổng chi phí việc làm thực tế cho bất kỳ nhân viên hay phòng ban nào.

**Hậu quả 5 — Không có tích hợp Sổ Cái hay phân bổ chi phí.**
Sau khi bảng lương được "trả," không có bút toán kế toán, không có phân bổ trung tâm chi phí và không có báo cáo chi phí lao động. Quy trình giấy tờ tạo ra bảng lương bút toán mà Kế toán ghi vào sổ sách. Hệ thống không tạo ra bất kỳ thứ gì tương đương. Nhóm Kế toán vẫn cần tính lại và nhập thủ công tất cả số liệu vào phần mềm kế toán riêng.

**Thiết kế đúng trông như thế nào:**

```
Module HR (vai trò HR_ADMIN)
  ├── Quản lý dữ liệu nhân viên và hợp đồng
  ├── Xem xét và chốt chấm công tháng
  ├── Xử lý bản ghi nghỉ phép đã duyệt
  └── Gửi "Gói dữ liệu đầu vào tính lương" cho Kế toán theo kỳ
         │
         ▼
Module Kế Toán (vai trò ACCOUNTANT — hiện không có)
  ├── Nhận gói dữ liệu đầu vào từ HR
  ├── Tính lương gộp, khấu trừ và lương thực nhận
  ├── Xem xét kết quả tính toán (Bảng lương)
  ├── Trình Bảng lương để phê duyệt
  │      │
  │      ▼
  │   Phê duyệt của Giám đốc Tài chính / Giám đốc Công ty
  │   (vai trò DIRECTOR — hiện không có)
  │      │
  │      ▼
  ├── Đánh dấu lương được phê duyệt để chi trả
  ├── Tạo file chuyển khoản ngân hàng
  ├── Ghi nghĩa vụ bảo hiểm và thuế phía sử dụng lao động
  └── Ghi bút toán kế toán (ngoài phạm vi v1, nhưng phải cân nhắc)
```

---

### 4.7 Quản Lý Hợp Đồng

**Chủ sở hữu nghiệp vụ:** Nhân Sự (điều khoản lao động) + Kế Toán (điều khoản lương)

**Quy trình dựa trên giấy tờ:**
HR soạn thảo điều khoản lao động của hợp đồng (vị trí, phòng ban, tuyến báo cáo, giờ làm việc, thời gian thử việc) và Kế toán/Tài chính xác nhận điều khoản lương và phúc lợi. Cả hai bộ phận ký duyệt. Nhân viên nhận bản sao; HR lưu bản gốc.

**Hành vi hệ thống hiện tại:**
`HR_ADMIN` tạo và quản lý tất cả trường hợp đồng bao gồm bậc lương, lương cơ sở, mức đóng bảo hiểm, mã vị trí, bước lương và số người phụ thuộc.

**Đánh giá: Các trường hợp đồng liên quan đến lương thuộc Kế toán, không phải HR.**

Trong thực tế, HR xác định *vị trí* và *cấp độ bậc*, nhưng *mức lương cụ thể* cho bậc đó được Tài chính đặt ra theo chính sách lương thưởng và ngân sách của công ty. Thiết kế hiện tại gộp hai quyền hạn này.

Cụ thể hơn, `Contract.dependentCount` là trường liên quan đến thuế (dùng để tính giảm trừ gia cảnh TNCN). Ở Việt Nam, giá trị này phải khớp với Mẫu 02/CK-TNCN (Đăng ký người phụ thuộc) đã nộp của nhân viên. Mẫu này do Kế toán xử lý, không phải HR.

Thiếu sót thêm:

| Vấn đề | Tác động nghiệp vụ |
|--------|---------------------|
| Chỉ một hợp đồng hoạt động mỗi nhân viên | Không có lịch sử hợp đồng; thăng chức yêu cầu ghi đè hợp đồng cũ, phá hủy hồ sơ điều khoản lao động ban đầu |
| Ngày hợp đồng lưu dưới dạng chuỗi | Không có cảnh báo hết hạn; hợp đồng có thể lặng lẽ hết hiệu lực mà không thông báo cho HR hoặc quản lý |
| Không áp dụng quy tắc loại hợp đồng | Các loại hợp đồng (xác định thời hạn 12 tháng, 24–36 tháng, không xác định thời hạn) có ý nghĩa pháp lý khác nhau (ví dụ chuyển đổi tự động sang không xác định thời hạn sau hai hợp đồng có thời hạn). Hệ thống lưu loại dưới dạng chuỗi tự do không có quy tắc. |
| Không theo dõi thời gian thử việc | Lương thử việc, thời gian thử việc và kết quả thử việc không được ghi nhận |
| Không có chữ ký điện tử hay xác nhận | Hệ thống lưu file đính kèm nhị phân nhưng không có quy trình cho nhân viên xác nhận điều khoản hợp đồng |

---

### 4.8 Phê Duyệt Lương

**Chủ sở hữu nghiệp vụ: Giám đốc Tài chính / Giám đốc Công ty**

Đây là sự lệch lạc nghiêm trọng thứ hai.

**Quy trình dựa trên giấy tờ:**
Bảng lương đã hoàn thiện, có chữ ký của Kế toán trưởng, được trình lên Giám đốc Tài chính hoặc Giám đốc Công ty. Người này xem xét tổng chi phí lương, kiểm tra lại số liệu cá nhân nếu cần thiết, và ký bảng lương để ủy quyền chuyển khoản ngân hàng. Ủy quyền này là **cam kết tài chính** của công ty.

**Hành vi hệ thống hiện tại:**
`HR_ADMIN` phê duyệt lương qua `PATCH /api/payrolls/{id}/approve`. Cùng vai trò đã tính lương cũng phê duyệt nó.

**Đánh giá: Phê duyệt chi lương không thuộc phạm vi thẩm quyền của HR.**

Ủy quyền chuyển khoản ngân hàng là ủy quyền tài chính thuộc về người có thẩm quyền tài chính đối với quỹ công ty — thường là Giám đốc Tài chính, CFO, hoặc Giám đốc Công ty (Giám đốc/Tổng Giám đốc). Trong doanh nghiệp Việt Nam, người ký bảng lương và ủy quyền chuyển khoản ngân hàng được xác định trong ủy quyền ngân hàng của công ty.

Ngay cả trong các công ty nhỏ nơi một người đảm nhiệm nhiều vai trò, hệ thống nên biến đây thành một hành động riêng biệt, tách biệt do người có năng lực Tài chính/Giám đốc thực hiện — không gộp vào bước phê duyệt của HR.

---

### 4.9 Cấu Hình Hệ Thống (Quy Tắc Thuế và Lương)

**Chủ sở hữu nghiệp vụ:** Kế Toán / Tài Chính (nội dung) + IT/Quản Trị Hệ Thống (triển khai kỹ thuật)

**Hành vi hệ thống hiện tại:**
`SYSTEM_ADMIN` quản lý tất cả cấu hình hệ thống bao gồm khung thuế, tỷ lệ bảo hiểm và bảng lương theo vị trí.

**Đánh giá: Quyền sở hữu nghiệp vụ của dữ liệu này bị xác định sai.**

Vai trò `SYSTEM_ADMIN` trong hệ thống này được hiểu là vai trò kỹ thuật. Tuy nhiên, nội dung của bảng lương theo vị trí, bậc thuế TNCN và tỷ lệ bảo hiểm là kiến thức kế toán — họ là người hiểu luật thuế Việt Nam, nhận thông báo từ Bộ Tài chính về thay đổi tỷ lệ, và chịu trách nhiệm áp dụng đúng các quy tắc này.

Thiết kế hiện tại yêu cầu quản trị viên hệ thống (người kỹ thuật) phải hiểu và nhập đúng các quy tắc kế toán vào hệ thống, hoặc yêu cầu nhóm Tài chính phải qua IT mỗi khi có cập nhật quy định. Cả hai đều không hiệu quả.

Thiết kế tốt hơn sẽ cấp cho vai trò `ACCOUNTANT` hoặc `FINANCE_ADMIN` khả năng quản lý cấu hình lương, với vai trò kỹ thuật `SYSTEM_ADMIN` chỉ dành cho cài đặt cấp hạ tầng.

---

## 5. Các Vai Trò Tổ Chức Còn Thiếu

Dựa trên phân tích trên, các vai trò sau hoàn toàn vắng mặt trong hệ thống:

### 5.1 ACCOUNTANT / FINANCE_ADMIN
Chịu trách nhiệm:
- Tính lương (nhận dữ liệu đầu vào từ HR và tính lương thực nhận).
- Quản lý cấu hình thuế và bảo hiểm.
- Tạo bảng tóm tắt chi phí phía sử dụng lao động.
- Xem xét và trình bảng lương để giám đốc phê duyệt.
- (Tương lai) Tạo báo cáo TNCN và file chuyển khoản ngân hàng.

### 5.2 DIRECTOR / APPROVER
Chịu trách nhiệm:
- Phê duyệt cuối bảng lương tháng trước khi chi trả.
- Phê duyệt thay đổi hợp đồng đáng kể (thăng chức, điều chỉnh lương vượt ngưỡng nhất định).

Nếu không có vai trò này, hệ thống không có cách nào đại diện cho ủy quyền tài chính cấp cao nhất mà mọi công ty đều yêu cầu trước khi trả lương cho nhân viên.

---

## 6. Tóm Tắt Sai Lệch Quyền Sở Hữu Quy Trình

| Quy trình | Giao cho trong hệ thống | Nên giao cho | Mức độ |
|---|---|---|---|
| Quản lý dữ liệu nhân viên | HR_ADMIN | HR | Đúng |
| Phê duyệt nghỉ phép (cuối) | HR_ADMIN | HR | Đúng |
| Phê duyệt tăng ca (cuối) | HR_ADMIN | HR | Đúng |
| Điều khoản lao động hợp đồng | HR_ADMIN | HR | Đúng |
| **Điều khoản lương trong hợp đồng** | HR_ADMIN | **Kế Toán / Tài Chính** | Trung bình |
| **Tính lương** | HR_ADMIN | **Kế Toán / Tài Chính** | Nghiêm trọng |
| **Phê duyệt lương** | HR_ADMIN | **Giám đốc Tài chính / Giám đốc** | Nghiêm trọng |
| **Cấu hình lương và thuế** | SYSTEM_ADMIN | **Kế Toán / Tài Chính** | Cao |
| Chi phí bảo hiểm người sử dụng lao động | Chưa triển khai | Kế toán | Thiếu sót nghiêm trọng |
| Quản lý số dư phép | Chưa triển khai | HR | Thiếu sót cao |
| Quyết toán thuế TNCN cuối năm | Chưa triển khai | Kế toán | Thiếu sót cao |
| Báo cáo chi phí lao động | Chưa triển khai | Kế Toán / Tài Chính | Thiếu sót cao |

---

## 7. Đề Xuất Tái Cơ Cấu Vai Trò

Mô hình vai trò sau đây sẽ phản ánh đúng thực tế tổ chức:

```
SYSTEM_ADMIN
  └── Kỹ thuật: cấu hình hạ tầng, quản lý người dùng, sức khỏe hệ thống

DIRECTOR
  └── Phê duyệt cuối bảng lương
  └── Phê duyệt thay đổi hợp đồng đáng kể
  └── Xem báo cáo chi phí lao động toàn công ty

FINANCE_ADMIN (mới)
  └── Tính lương và quản lý
  └── Quản lý cấu hình thuế và lương
  └── Tạo bảng tóm tắt chi phí phía sử dụng lao động
  └── Tạo dữ liệu báo cáo TNCN và chuyển khoản ngân hàng

HR_ADMIN
  └── Vòng đời nhân viên (tạo, cập nhật, thôi việc)
  └── Điều khoản lao động hợp đồng (loại, ngày, vị trí)
  └── Chính sách nghỉ phép và phê duyệt nghỉ phép cuối cùng
  └── Giám sát và chỉnh sửa chấm công
  └── Gửi gói dữ liệu đầu vào tính lương cho Tài chính

MANAGER
  └── Phê duyệt tăng ca và nghỉ phép (cấp 2)
  └── Nhập đánh giá KPI cho nhân viên trực tiếp dưới quyền
  └── Xem chi phí lương phòng ban (chỉ đọc)

LEADER
  └── Phê duyệt tăng ca và nghỉ phép (cấp 1)

EMPLOYEE
  └── Xem dữ liệu bản thân, nộp đơn yêu cầu
```

Và quy trình tính lương nên được thiết kế lại như một quy trình bàn giao:

```
HR_ADMIN chốt tháng:
  → Đánh dấu chấm công đã hoàn tất cho kỳ
  → Gửi gói dữ liệu đầu vào tính lương

FINANCE_ADMIN tính lương:
  → Chạy tính toán dùng dữ liệu chấm công và OT do HR cung cấp
  → Xem xét bảng lương
  → Gửi để Giám đốc ủy quyền

DIRECTOR ủy quyền:
  → Xem xét tổng chi phí lương
  → Phê duyệt → bảng lương bị khóa để thanh toán

FINANCE_ADMIN đánh dấu đã trả:
  → Ghi ngày thanh toán
  → Hệ thống tạo bảng tóm tắt chi phí phía sử dụng lao động để nộp bảo hiểm/thuế
```

Thiết kế này bảo toàn sự phân tách nhiệm vụ mà quy trình giấy tờ áp dụng qua chữ ký vật lý, và phân phối trách nhiệm đúng đắn cho các chức năng sở hữu từng phần của quy trình.

---

## 8. Kết Luận

Triển khai kỹ thuật tính lương của hệ thống là một trong những điểm mạnh nhất. Công thức lương, chấm điểm KPI, hệ số nhân OT và các quy tắc khấu trừ theo quy định Việt Nam được lập trình đúng. Quy trình phê duyệt nghỉ phép và tăng ca nhiều cấp có cấu trúc vững chắc.

Vấn đề cơ bản là **mô hình quy trình nghiệp vụ không phản ánh cách công ty thực sự được tổ chức**. Vai trò `HR_ADMIN` đã hấp thu trách nhiệm của HR, Kế toán và Giám đốc Tài chính vào một tác nhân duy nhất. Điều này không đơn giản hóa hoạt động — mà loại bỏ các kiểm soát tài chính nội bộ thiết yếu cho công ty xử lý chi lương, nộp thuế và đóng góp bảo hiểm.

Quá trình chuyển đổi thành công từ quản lý giấy tờ sang quản lý phần mềm yêu cầu phần mềm phải tái tạo, không loại bỏ, các thẩm quyền phê duyệt và ranh giới chức năng tồn tại trong quy trình giấy tờ. Thay đổi thiết kế cấp bách nhất là đưa vai trò `ACCOUNTANT`/`FINANCE_ADMIN` sở hữu tính lương và cấu hình, và vai trò `DIRECTOR` sở hữu phê duyệt lương cuối — đồng thời loại bỏ các trách nhiệm này khỏi `HR_ADMIN`.

---

*Kết thúc Tài liệu 4*
