# Quản trị tài khoản và nội dung website

## Phạm vi đã triển khai

Một frontend Next.js và một backend Spring Boot. Ba vai trò cố định theo kế hoạch: AUTHOR, EDITOR, ADMIN. Quyền được khai báo tại Role và thực thi trong use case; Proxy chỉ kiểm tra quyền điều hướng. Màn Phân quyền hiển thị ma trận quyền, màn Tài khoản gán vai trò cho người dùng.

Chưa có trình tạo vai trò tùy ý, SSO hoặc gửi email reset tự động. Cơ chế reset hiện tại là liên kết dùng một lần do quản trị viên cấp và gửi riêng cho người nhận. Không có quy trình duyệt bài hoặc duyệt trang chủ/menu.

## Các màn hình

| Route                           | Chức năng                                                                           | Quyền               |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------------- |
| /admin/users                    | Tìm, phân trang, mời, sửa tài khoản, khóa/mở, gán vai trò, cấp reset, thu hồi phiên | identity:manage     |
| /admin/roles                    | Ma trận quyền của ba vai trò                                                        | identity:manage     |
| /admin/security                 | Tự đổi mật khẩu bằng mật khẩu hiện tại                                              | Có phiên hợp lệ     |
| /admin/reset-password           | Đặt mật khẩu qua token một lần                                                      | Token hợp lệ + CSRF |
| /admin/site/home                | Hero, ảnh, các khối, chương trình, tin ghim, liên hệ/chân trang                     | site:manage         |
| /admin/site/menu                | Mục chính/mục con, thứ tự, liên kết tài nguyên                                      | site:manage         |
| /admin/site/{home,menu}/preview | Xem bản nháp bằng renderer dùng chung                                               | site:manage         |

## Cấp và quản lý tài khoản

1. Admin chọn **Thêm tài khoản**, điền email, tên và vai trò.
2. Tài khoản ở trạng thái chờ đặt mật khẩu. Mật khẩu khởi tạo ngẫu nhiên không được trả ra.
3. Sao chép liên kết trong hộp thoại và gửi riêng cho người dùng. Liên kết không được lưu ở localStorage.
4. Người nhận tự đặt mật khẩu rồi đăng nhập. Không tự đăng nhập sau reset.
5. Khi lưu thay đổi tài khoản, hệ thống thu hồi toàn bộ phiên và liên kết reset cũ. Nếu sửa tài khoản của mình, admin được đưa về đăng nhập.

Không xóa cứng tài khoản đã gắn với bài viết và lịch sử; dùng khóa đăng nhập. Tài khoản Admin chờ đặt mật khẩu không được tính vào số quản trị viên đã kích hoạt.

Domain AdministrationPolicy giữ ít nhất một Admin đang hoạt động và đã đặt mật khẩu. Mọi thay đổi tài khoản/tiêu thụ token lấy cùng transaction advisory lock trong PostgreSQL trước khi đọc trạng thái. Vì vậy hai yêu cầu khóa/hạ quyền đồng thời không thể cùng loại bỏ hai admin cuối.

Account.version kiểm soát cập nhật cạnh tranh. Account.authVersion là thế hệ chứng thực; thay đổi quyền, thông tin, trạng thái, mật khẩu hoặc thu hồi phiên sẽ tăng thế hệ này. Các phiên JDBC bị xóa theo principal; SessionAccountFilter kiểm tra thế hệ trên mỗi request để chặn cả phiên còn sót trong một request đang chạy.

Bootstrap chỉ tạo admin khi bảng tài khoản còn rỗng, trong cùng khóa giao dịch. Khởi động lại không tái tạo tài khoản bootstrap sau khi admin đổi email, không đổi mật khẩu đã có.

## Mật khẩu và reset

- Mật khẩu tối thiểu 12 Unicode code point, tối đa 72 byte UTF-8 theo giới hạn BCrypt; BCrypt cost 12.
- Đổi mật khẩu cần mật khẩu hiện tại, không nhận mật khẩu mới trùng mật khẩu cũ.
- Token reset gồm 32 byte sinh bằng SecureRandom, mã hóa base64url; chỉ SHA-256 của token được lưu ở database.
- Hết hạn sau 30 phút, dùng một lần, gắn với authVersion. Cấp token mới vô hiệu hóa token cũ.
- Cấp liên kết không khóa tài khoản và không đổi mật khẩu hiện tại.
- Reset hoặc đổi mật khẩu thành công thu hồi mọi phiên; không gửi hash, mật khẩu hoặc token vào audit.
- Token nằm trong URL fragment, không gửi trong request GET tới máy chủ; frontend đọc rồi xóa fragment. POST reset vẫn cần CSRF và Origin hợp lệ. Trang reset có referrer policy no-referrer.
- Giới hạn thử đổi/reset hiện ở bộ nhớ backend. Khi nhân bản backend cần chuyển giới hạn sang kho chung.

Tham khảo thiết kế: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## Soạn và xuất bản trang chủ/menu

Mỗi loại tài liệu và locale có một SiteDocument. Bản nháp và bản công khai tách biệt; SiteDocument.Release là snapshot bất biến.

1. Chọn tiếng Việt hoặc bản tiếng Anh riêng.
2. Sửa nội dung trong các khối có sẵn. Trang chủ cho phép đổi thứ tự/ẩn các khối; menu tối đa hai cấp.
3. **Lưu nháp** chỉ lưu vào bản biên tập. **Xem trước** lưu nháp rồi mở route được bảo vệ.
4. **Đăng công khai** lưu nội dung đang nhập, kiểm tra toàn bộ tham chiếu và đổi bản công khai trong giao dịch.
5. **Lịch sử xuất bản → Khôi phục** đưa snapshot cũ về nháp. Cần đăng lại để thay bản công khai.

Khi gặp xung đột phiên bản, giao diện giữ dữ liệu đang nhập và cho tải JSON dự phòng. Không tự ghi đè cấu hình mới của người khác. Chưa có autosave/offline sync cho trang chủ/menu; bấm Lưu nháp trước khi chuyển màn.

### Các giới hạn có chủ đích

- Hero, giới thiệu, đào tạo, tin tức, kết nối và chân trang dùng component/design token chung; CMS không nhập HTML, CSS hoặc JavaScript.
- Hero dùng ảnh READY từ Media. Ảnh nháp chỉ được tải với quyền admin; publish mới cấp public usage cho ảnh. Đổi ảnh công khai sẽ gỡ usage public của ảnh cũ, trừ khi tài liệu công khai khác còn dùng.
- Tối đa 6 thẻ chương trình. Có thể chọn liên kết Chương trình công khai để lấy tên/tóm tắt từ Academics; các thẻ liên kết ngoài hiện có vẫn hoạt động. Xem [Academics](academics.md).
- Tin tức: 1–12 tin, có chuyên mục tự động và thứ tự tin ghim. Chỉ bài còn công khai mới được hiển thị.
- Menu: tối đa 8 mục chính, 10 mục con mỗi mục chính, tổng tối đa 40; mã mục không trùng.
- Liên kết có kiểu HOME, NEWS, ANCHOR, CATEGORY, ARTICLE, EXTERNAL, GROUP. Liên kết ngoài chỉ HTTPS, không userinfo hoặc script. GROUP cần mục con.
- ARTICLE lưu UUID, không lưu slug. Đổi slug bài viết làm liên kết menu cập nhật theo projection public; gỡ bài làm mục đó bị ẩn. Nhóm hết mục con và không có đích sẽ bị ẩn.
- Không cho đăng liên kết tới bài chưa public hoặc khối trang chủ bị ẩn. Nếu khối đích bị ẩn sau đó, public resolver bỏ liên kết không còn hợp lệ.
- Tiếng Việt được seed bằng nội dung template cũ. Tiếng Anh bắt đầu là bản sao làm việc chưa công khai; cần dịch và đăng riêng. Giao diện CMS hiện dùng tiếng Việt.

## Ranh giới module và giao dịch

Identity: Account, PasswordReset, PasswordPolicy, AdministrationPolicy → IdentityService → IdentityStore/IdentityEffects → JDBC, BCrypt, session và Audit.

Site: SiteDocument, HomeComposition, NavigationMenu, SiteLink → SiteService → SiteRepository/SiteEffects → JDBC JSONB, Media.api, Discovery.api, Audit.api.

Publishing đã gọi Site.api để quản lý route. Site đọc bài công khai qua Discovery.api, tránh dependency vòng với Publishing. Hai module không truy cập trực tiếp schema nội bộ của nhau. Domain/application không phụ thuộc Spring, Jackson hoặc JPA.

Migration V2 bổ sung version, password_set và password_reset; V3 bổ sung managed_document và document_release. Giao dịch xuất bản Site bao gồm snapshot, live pointer, media usage và audit. Public SSR/API dùng no-store để đọc kết quả sau commit.

Quyền `academics:manage` đã được bổ sung cho Editor và Admin. Menu có liên kết chương trình/đợt tuyển theo ID; trang chủ có thêm khối tuyển sinh đang mở.

## Hợp đồng API triển khai

Các đường dẫn sau có tiền tố /api/v1.

| Method    | Route                                      | Ghi chú                                                                    |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| GET       | /admin/users?q=&page=0&size=20             | Account DTO an toàn, tìm tên/email; size ≤ 100                             |
| POST      | /admin/users                               | email, name, role, active; trả account và reset.token một lần              |
| PATCH     | /admin/users/{id}                          | If-Match; email, name, role, active                                        |
| POST      | /admin/users/{id}/reset-links              | If-Match; trả token và expiresAt                                           |
| POST      | /admin/users/{id}/revoke-sessions          | If-Match; tăng authVersion, thu hồi phiên/token                            |
| GET       | /admin/roles                               | code, name, permissions                                                    |
| POST      | /auth/change-password                      | currentPassword, password                                                  |
| POST      | /auth/reset-password                       | token, password                                                            |
| GET/PATCH | /admin/site/{home,menu}?locale=vi          | GET có version/draftVersion/status/content; PATCH nhận content và If-Match |
| POST      | /admin/site/{home,menu}/publish?locale=vi  | If-Match, draftVersion                                                     |
| GET       | /admin/site/{home,menu}/releases?locale=vi | 50 lần xuất bản gần nhất                                                   |
| POST      | /admin/site/{home,menu}/restore?locale=vi  | If-Match, releaseId                                                        |
| GET       | /admin/site/{home,menu}/preview?locale=vi  | Bản nháp + URL đã resolve + tin công khai                                  |
| GET       | /public/site/{home,menu}?locale=vi         | Chỉ snapshot đã công khai; chưa có trả 404                                 |

Header If-Match chứa version tài liệu/tài khoản. Thiếu header trả 428, phiên bản cũ trả 412, thiếu quyền trả 403, vi phạm bất biến trả 422. Các mutation dùng cùng CSRF/session client hiện có.

### Chế độ khối tuyển sinh

Home cho chọn `OPEN` (chỉ đợt đang nhận hồ sơ) hoặc `LATEST` (thông báo mới nhất, có thể đã hết hạn). Dữ liệu seed dùng `LATEST`; nhãn trạng thái từng thông báo vẫn tính theo thời gian thực. Xem [Nhập nguồn](reference-import.md).
