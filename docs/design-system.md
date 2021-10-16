# Design system cho website giáo dục và CMS

## Định hướng hình ảnh

Visual thesis: một website học thuật rõ ràng, đáng tin cậy, nhiều khoảng thở, sử dụng ảnh thật về học tập, khảo sát đất đai, GIS và nghiên cứu tại Cần Thơ làm trọng tâm.

Content plan: nhận diện bộ môn và ngành học → thông tin giúp chọn chương trình → tuyển sinh đang còn hạn → hoạt động/nghiên cứu làm bằng chứng → đầu mối liên hệ rõ ràng.

Interaction thesis: nội dung xuất hiện nhanh bằng fade, menu và bộ lọc phản hồi bằng màu, viền và gạch chân. Nút giữ nguyên vị trí khi hover; chuyển động hỗ trợ việc đọc và xác định thao tác, tôn trọng `prefers-reduced-motion`.

Giao diện hiện dùng fade ngắn cho hero và khối nội dung, slider tin tức điều khiển bằng nút/mũi tên, một bài trọn vẹn trên mỗi khung ở mọi kích thước, và nút về đầu trang khi đọc nội dung dài. Slider không tự chạy. Nút/đường dẫn có hover và focus rõ; điều hướng anchor dùng cuộn mượt. Khi bật giảm chuyển động, CSS và hành vi cuộn trở về tức thời, nội dung luôn hiển thị. Dữ liệu slider lấy từ CMS tin tức hiện có, không tạo nội dung hay cấu hình riêng.

CSS public nằm ở `apps/web/src/app/public-design.css`, nhập sau CSS nền để áp dụng cùng một template cho trang public và bản xem trước CMS. Khối đào tạo là danh mục có số thứ tự, thumbnail lấy từ ảnh bìa của chương trình đã công khai và đường phân cách; chương trình chưa có ảnh dùng ký hiệu trung tính. Bài nổi bật có ảnh lớn kèm phần chữ riêng, tránh chữ nằm trực tiếp trên ảnh. Hero và banner đào tạo/tuyển sinh dùng chữ trắng trên gradient xanh đậm; cần giữ mức phủ này khi người quản trị thay ảnh. Link có con trỏ pointer và dấu hiệu hover/focus; nút giữ kích thước và tọa độ khi hover. Ảnh đầu tiên của tin nổi bật được tải sớm để khung chính không trắng khi vừa vào trang.

Trang lưu trữ tin dùng hàng biên tập với thumbnail vừa phải, tiêu đề và metadata là trọng tâm; trên điện thoại ảnh thu về ô nhỏ bên phải để đọc được nhiều tin hơn mỗi màn hình. Bộ lọc có đường phân cách nhẹ, không dùng nền hộp xám. Slider tin nổi bật trên trang chủ tiếp tục dùng ảnh lớn và bố cục riêng.

Logo và tên đơn vị phải được lấy từ tài nguyên chính thức. Bảng màu dưới đây là đề xuất thiết kế, không khẳng định là bộ màu nhận diện chính thức CTU. Ảnh dùng từ nguồn của đơn vị có quyền sử dụng; không dựng cảnh hoặc số liệu để mô phỏng thành tích thật.

## Hệ thống token

| Nhóm        | Token đề xuất                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| Thương hiệu | `brand.900 #153B64`; `brand.600 #195BCB`                                                             |
| Nền         | `surface.canvas #F7F8FA`; `surface.default #FFFFFF`; `surface.subtle #EEF3F8`                        |
| Chữ         | `text.primary #172B3A`; `text.secondary #526174`; `text.inverse #FFFFFF`                             |
| Viền        | `border.default #DCE2E9`; focus ring dùng màu action có độ tương phản đủ                             |
| Trạng thái  | `success #166534`; `warning #92400E`; `danger #B42318`; kèm nhãn/icon                                |
| Typography  | Public đang dùng Segoe UI/Arial có hỗ trợ tiếng Việt; cân nhắc font riêng khi có asset được cấp phép |
| Cỡ chữ      | Body public 17–18px; admin 14–16px; heading 24/32/40/56px, responsive bằng clamp                     |
| Line-height | Body 1.65–1.75; heading 1.15–1.3; vùng đọc 65–75 ký tự mỗi dòng                                      |
| Spacing     | 4/8/12/16/24/32/48/64/96px                                                                           |
| Bo góc      | 6px cho input/button; 10–12px cho dialog/media; không bo tròn mọi khối                               |
| Container   | Tối đa khoảng 1200–1280px; gutter 20px mobile, 32px tablet, 48px desktop                             |
| Grid        | 4 cột mobile, 8 tablet, 12 desktop; breakpoint theo nội dung                                         |
| Motion      | 120–180ms cho control, 220–320ms cho fade/reveal; không dịch vị trí nút                              |

Token có tầng primitive và semantic. Component chỉ dùng semantic token để có thể điều chỉnh nhận diện mà không sửa từng màn hình. Public và admin chia sẻ token, nhưng khác density, kích thước typography và cấu trúc layout.

Thiết kế ưu tiên nền sáng; dark mode không là điều kiện phát hành V1. Kiểm tra contrast thực tế trước khi khóa token. Mục tiêu tiếp cận là WCAG 2.2 AA, gồm focus, keyboard, contrast và kích thước mục tiêu tương tác. [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Kiến trúc điều hướng public

Menu chính khoảng sáu mục: **Giới thiệu, Đào tạo, Tuyển sinh, Nghiên cứu, Sinh viên, Tin tức**. Search và đổi ngôn ngữ ở utility area; Liên hệ luôn dễ tìm.

| Menu       | Nội dung con                                                               |
| ---------- | -------------------------------------------------------------------------- |
| Giới thiệu | Bộ môn, cơ cấu, nhân sự, phòng thí nghiệm, liên hệ                         |
| Đào tạo    | Ngành/bậc học, chương trình, AUN-QA, tài liệu chất lượng                   |
| Tuyển sinh | Đợt hiện hành, đại học, sau đại học, hướng dẫn và liên kết hệ thống trường |
| Nghiên cứu | Dự án, công bố, chuyển giao, giáo trình, hội thảo                          |
| Sinh viên  | Thông báo, hoạt động, biểu mẫu, học bổng, việc làm, cựu sinh viên          |
| Tin tức    | Tin bộ môn, sự kiện, bài viết theo chuyên mục                              |

Hội thảo theo năm nằm trong danh mục/sự kiện và trang lưu trữ. Mobile dùng drawer có accordion tối đa hai tầng, hỗ trợ bàn phím và focus trap. Route hiện hành có nhãn rõ; không chỉ đổi màu nhẹ.

## Bố cục trang chủ

1. Header rõ logo, tên đơn vị, menu và tìm kiếm. Không dồn nhiều nút hành động lên cùng một hàng.
2. Hero full bleed dùng một ảnh thật có vùng tương phản tốt; tên bộ môn nổi bật, mô tả một câu, CTA chính “Khám phá chương trình”. Link phụ “Thông tin tuyển sinh” khi có đợt còn hạn.
3. Khối đào tạo: hai lĩnh vực chính và các bậc học, dùng hàng/cột có phân cấp rõ. Không đặt mọi chương trình vào các card giống nhau.
4. Tuyển sinh hiện hành: tên đợt, bậc học, hạn và trạng thái. Nếu không có đợt mở, hiển thị thông tin hướng dẫn trung tính, không tạo cảm giác đang nhận hồ sơ.
5. Tin mới và hoạt động: một bài nổi bật kèm danh sách gọn, ngày tháng dễ đọc.
6. Nghiên cứu và phòng thí nghiệm: ảnh, một dự án/công bố đại diện và link xem tiếp; chỉ dùng thông tin có nguồn.
7. Tài nguyên sinh viên và liên hệ: lối vào biểu mẫu, thông báo, email/địa chỉ; footer có liên kết hệ thống trường.

Mỗi section có một vai trò chính. Header và hero cùng nằm trong ngân sách chiều cao màn hình phổ biến; không chồng header lên hero 100vh rồi đẩy toàn bộ nội dung xuống dưới. Chữ trên ảnh có lớp nền/gradient tương phản vừa đủ; ảnh không được chứa chữ quảng cáo gây cạnh tranh với UI.

Không dùng carousel tự chạy ở phần đầu. Không có grid dashboard, số liệu chưa xác minh hay dải logo trang trí để lấp chỗ trống.

## Template trang chi tiết

| Template           | Bố cục và hành động                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Bài viết           | Breadcrumb, chuyên mục, H1, tóm tắt, tác giả/ngày, ảnh, nội dung dễ đọc, tài liệu và bài liên quan                  |
| Chương trình       | Tên và bậc học, thông tin cốt lõi, mục tiêu/chuẩn đầu ra, cấu trúc chương trình, cơ hội nghề nghiệp, CTA tuyển sinh |
| Đợt tuyển sinh     | Trạng thái, thời hạn, đối tượng/ngành, hồ sơ, timeline, liên kết nộp và đầu mối; trạng thái hết hạn không bị giấu   |
| Nhân sự            | Ảnh và chức danh, chuyên môn, liên hệ công khai, quá trình/công bố liên quan                                        |
| Phòng thí nghiệm   | Ảnh, chức năng, thiết bị, hướng nghiên cứu, đầu mối                                                                 |
| Nghiên cứu         | Dữ liệu thư mục/dự án, trạng thái, thành viên, kết quả và liên kết/tệp                                              |
| Danh sách/tìm kiếm | Tiêu đề, filter URL-based, số kết quả, danh sách phân trang, empty state                                            |
| Tài liệu           | Loại, dung lượng, ngày cập nhật, ngôn ngữ, quyền tải; phân biệt link ngoài và file                                  |

Các nhóm thông tin dài dùng section có anchor hoặc table of contents theo nhu cầu; tránh giấu toàn bộ nội dung quan trọng trong tab/accordion. Bảng chương trình phải đọc được trên mobile.

Trang bài viết public có khung ngoài và ảnh bìa trùng chiều rộng với header. Bài không có mục lục dùng toàn bộ chiều rộng khung nội dung, không giữ cột trống hoặc giới hạn 900px lệch trái. Chỉ bài có ít nhất hai mục mới chia cột: phần chữ chính khoảng 860px, phần còn lại dành cho mục lục bám theo. Từ 1050px trở xuống, mục lục thu vào `details` và thân bài dùng toàn bộ chiều rộng còn lại. Quy tắc này áp dụng cả bài giới thiệu bộ môn khi không còn đủ tiêu đề để tạo mục lục. Nội dung gốc nhập từ website cũ được chuẩn hóa trong dữ liệu seed: các đoạn nhiều lần xuống dòng được tách, khoảng trắng thừa được gộp, nhãn mục in đậm được đưa thành heading phù hợp; H2 của nguồn dùng như gạch đầu dòng hoặc đoạn dài trở về thân bài. Các danh sách đánh số một mục và ngắn được nhận diện cho mục lục nếu bài có ít nhất ba mục tương tự; chúng vẫn hiển thị ở cỡ chữ thân bài. Gạch đầu dòng gõ tay được căn lề nhất quán. Chữ in đậm độc lập chỉ tăng độ đậm, không tự động tăng cỡ chữ. Heading do biên tập viên tạo trong CMS vẫn giữ phân cấp tiêu đề. Bảng có hàng tiêu đề, sọc nền nhẹ, vùng cuộn ngang độc lập và gợi ý vuốt ngang trên màn nhỏ. Bố cục này dùng chung cho bản xem trước CMS.

Danh sách ngắn của bài nhập được chia hai cột trên desktop và trở về một cột trên mobile; mục đánh số dùng cỡ chữ thân bài và nhóm tiêu đề con sát với mục chính. Bảng nhân sự nhập từ nguồn cũ được trình bày theo từng người, gắn ảnh với tên và email trong cùng một khối. Bảng chỉ gồm ảnh và chú thích trở thành lưới ảnh hai cột, một cột trên mobile. Bảng dữ liệu còn lại tiếp tục giữ cấu trúc bảng và vùng cuộn ngang. Các biến đổi này chỉ tác động đến bản hiển thị, không thay đổi nội dung CMS.

## Workspace CMS

Admin có sidebar cố định trên desktop, thanh tiêu đề chứa breadcrumb và hành động, nội dung ưu tiên bảng/danh sách. Trang đầu hiển thị công việc thực: nháp gần đây, bài đã đăng, đợt sắp đóng và lỗi tài nguyên cần xử lý.

Sidebar quản trị nhóm lối đi theo Nội dung, Website và Hệ thống; chỉ hiện mục mà tài khoản có quyền. Mục hiện tại có nền xanh nhạt và vạch nhấn bên trái. Dưới 1024px, sidebar trở thành ngăn kéo mở từ nút trên thanh trên cùng, đóng bằng Escape hoặc lớp phủ. Bảng rộng cuộn ngang trong chính vùng bảng; các form và tiêu đề hành động xếp dọc trên điện thoại.

Danh sách bài có search, lọc loại/trạng thái/locale, sort ngày cập nhật, pagination và bulk action có phạm vi quyền. Cột mặc định: tiêu đề, loại, trạng thái, ngôn ngữ, người sửa, thời gian. Bulk publish phải kiểm tra từng entry và báo kết quả từng mục.

Editor có ba vùng: thông tin định hướng ở trên, vùng soạn ở giữa, inspector bên cạnh cho chuyên mục/ảnh/SEO. Inspector thu gọn trên màn nhỏ. Thanh hành động gồm **Lưu nháp**, **Xem trước**, **Đăng công khai** hoặc **Cập nhật công khai** tùy trạng thái.

| Tình huống                   | Phản hồi giao diện                                                  |
| ---------------------------- | ------------------------------------------------------------------- |
| Đang gõ                      | Hiển thị thay đổi chưa lưu, autosave có debounce                    |
| Đang lưu                     | Chỉ báo tiến trình, không làm nhảy vùng soạn                        |
| Lưu thất bại                 | Giữ nội dung, báo lỗi và cho thử lại                                |
| Publish thành công           | Thời điểm đăng và link xem trang công khai                          |
| Chưa đủ điều kiện đăng       | Nêu trường/asset thiếu, focus đến vị trí cần sửa                    |
| Bài đang public có draft mới | Nhãn “Có thay đổi chưa công khai”                                   |
| Conflict giữa hai người      | Không ghi đè; cho xem bản server và giữ bản đang nhập               |
| Mất quyền/phiên hết hạn      | Dừng mutation, giữ nội dung trong bộ nhớ và hướng dẫn đăng nhập lại |
| Gỡ bài/xóa                   | Nêu rõ tác động, yêu cầu xác nhận ngay trong thao tác này           |

Preview dùng cùng ContentRenderer/template với public để tránh sai khác. Preview nằm trong route admin có quyền, watermark trạng thái, `noindex`, `no-store`; V1 không có public bearer preview link.

Không đưa tên database, HTTP status, stack trace hoặc thuật ngữ framework vào thông báo thông thường. Có mã lỗi/request ID trong phần chi tiết để hỗ trợ khi cần.

## Danh mục component

| Tầng       | Component                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| Foundation | Token, typography, spacing, icon, focus ring, reduced motion                                              |
| Primitive  | Button, Link, Input, Select, Checkbox, Radio, Dialog, Drawer, Tabs, Tooltip, Toast                        |
| Data/form  | DataTable, Pagination, SearchInput, FilterBar, FormField, DateTimeField, EmptyState, ErrorState           |
| Education  | ProgramSummary, AdmissionStatus, DeadlineInfo, FacultyProfile, ResearchCitation, DocumentLink             |
| Editorial  | ArticleHeader, RichContentRenderer, ImageFigure, ContentList, Breadcrumb, TableOfContents                 |
| CMS        | EditorToolbar, MediaPicker, PublishPanel, AutosaveStatus, RevisionHistory, LocaleSwitcher, PermissionGate |
| Layout     | PublicHeader, PublicFooter, AdminShell, PageContainer, ReadingColumn                                      |

PermissionGate chỉ điều chỉnh UI; quyền thực thi vẫn ở backend. Component domain nhận view model có kiểu, không tự gọi API lung tung. Các component cơ bản không biết module nghiệp vụ.

Storybook là nơi tài liệu hóa token, component và trạng thái; không triển khai thành một frontend sản phẩm riêng. Bộ fixture có dữ liệu tiếng Việt dài, tiêu đề hai/ba dòng, bảng rộng và ảnh thiếu.

## Hợp đồng block của CMS

| Block              | Trường biên tập                           | Giới hạn thiết kế                           |
| ------------------ | ----------------------------------------- | ------------------------------------------- |
| `hero`             | Tiêu đề, mô tả, asset, CTA, focal point   | Một hero/trang, tối đa hai CTA              |
| `text-media`       | Rich text, ảnh, caption, vị trí ảnh       | Các variant bố cục được định nghĩa trước    |
| `program-list`     | Program reference hoặc filter bậc học     | Chỉ chương trình công khai, số mục hữu hạn  |
| `admission-list`   | Phạm vi bậc học, số mục                   | Trạng thái lấy từ backend, không nhập tay   |
| `content-list`     | Loại/chuyên mục, pinned references, limit | Không trùng bài, chỉ public/đúng locale     |
| `research-feature` | Project/work reference, mô tả ngắn        | Không sao chép số liệu nguồn thành text rời |
| `document-list`    | Resource/asset references                 | Kiểm tra visibility và metadata tải         |
| `contact`          | Đầu mối, email/địa chỉ, liên kết          | Dữ liệu có cấu trúc, không nhúng script     |

Được đổi thứ tự các section phụ và chọn variant có sẵn. Không nhập class CSS, khoảng cách tùy ý hoặc arbitrary HTML. Đặt giới hạn title/body ở form và schema; giới hạn theo nhu cầu template, hỗ trợ tiếng Việt và không cắt mất thông tin nghiệp vụ.

Schema và renderer version phải tương thích khi deploy: bổ sung block theo hướng đọc được dữ liệu cũ, migrate sau, rồi mới loại version cũ. CMS chỉ cho xuất bản loại block renderer hiện tại hỗ trợ.

## Responsive, tiếp cận và SEO

- Kiểm tra các chiều rộng 360, 390, 768, 1280 và 1440px; không có tràn ngang ngoài vùng bảng có chủ đích.
- H1 rõ, heading theo nội dung; dùng landmark, skip link, label form và lỗi được liên kết tới trường.
- Nút quan trọng tối thiểu khoảng 44px ở mobile; focus luôn nhìn thấy; menu/dialog hỗ trợ keyboard và screen reader.
- Alt mô tả mục đích của ảnh theo ngữ cảnh; ảnh trang trí có alt rỗng hợp lệ.
- Không dùng màu làm dấu hiệu trạng thái duy nhất. Motion không khóa thao tác, không autoplay video có âm thanh.
- Metadata riêng mỗi trang, canonical, Open Graph, sitemap và hreflang chỉ cho bản dịch thực sự public.
- Chọn structured data đúng loại và dữ liệu có thật; không gắn schema Course cho mọi trang giáo dục.
- Admin, preview, trang kết quả tìm kiếm và trạng thái nội bộ có chính sách index rõ ràng. `noindex` không thay thế xác thực.

## Điều kiện duyệt thiết kế trước triển khai diện rộng

Hoàn thiện sáu màn đại diện: trang chủ, chi tiết chương trình, chi tiết bài, danh sách CMS, editor và media picker. Kiểm tra cả desktop/mobile, tiếng Việt có dấu, nội dung dài và trạng thái lỗi. Chốt token và template qua các màn này rồi áp dụng cho phần còn lại để tránh mỗi module có một giao diện riêng.
