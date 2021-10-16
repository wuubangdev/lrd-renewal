# Nhập nhanh đối tượng CMS bằng Excel

CMS có nút **Tải mẫu .xlsx** và **Nhập dữ liệu** tại **Cán bộ**, **Phòng thí nghiệm**, **Hội thảo**, từng loại **Nghiên cứu & học liệu**, và **Chương trình đào tạo**. Tải mẫu ngay ở màn hình tương ứng, giữ nguyên tên sheet và cột, điền dữ liệu, chọn file và nhập. Một hàng trong sheet chính tạo một đối tượng. Các sheet phụ dùng cột `key` giống hàng chính để thêm nhiều mục. Import luôn tạo **bản nháp**; quản trị viên rà soát từng bản ghi và công khai theo luồng hiện có.

## Mẫu cán bộ

Sheet `People` chứa các thuộc tính cố định của hồ sơ: `key`, `name`, `slug`, `academicTitle`, `degree`, `highestDegreeYear`, `academicRank`, `academicRankYear`, `birthDate`, `birthPlace`, `position`, `unit`, `email`, `phone`, `office`, `website`, `summary`, `researchInterests`, `portraitId`, `portraitAlt`, `template`, `sourceArticleId`, `privateNotes`. `name` và `slug` bắt buộc. `template` để trống sẽ dùng `EDITORIAL`; các giá trị khác: `ACADEMIC`, `COMPACT`, `PORTRAIT`, `DOSSIER`.

Mỗi hàng trong các sheet phụ có `key` trùng với cán bộ tương ứng và trở thành một phần tử của mảng có kiểu: `Undergraduate`, `Postgraduate` (bậc học, thời gian, cơ sở, chuyên ngành, năm cấp bằng, luận văn/luận án, hình thức); `WorkHistory` (thời gian, đơn vị, chức vụ, mô tả); `ResearchProjects`, `Publications`, `Books`, `Supervisions`, `TrainingCourses`, `Awards`, `Memberships`, `OtherActivities` (tên, giai đoạn, đơn vị, vai trò, chi tiết, liên kết); `Languages` (ngoại ngữ, mức độ, chứng chỉ). `Specialties` có một chuyên môn trên mỗi hàng. `PrivateFacts` chỉ hiển thị trong CMS. Mẫu hiện tại sử dụng các sheet này thay cho `Sections`/`Blocks` tự do của bản cũ.

Hồ sơ cán bộ đã lưu theo cấu trúc cũ được chuyển sang các trường cố định khi API đọc dữ liệu. Khi chỉnh sửa, CMS dùng 7 chủ đề; hồ sơ mới đi lần lượt từng bước, còn hồ sơ cũ có thể mở trực tiếp bất kỳ chủ đề. Mỗi danh sách có nút **Thêm dòng**. Trang công khai đọc `academic` thay vì dựng nội dung từ `sections`; dữ liệu gốc trong `sections` được giữ để đối chiếu khi chuyển đổi.

## Mẫu phòng thí nghiệm / cơ sở vật chất

Sheet `Laboratories` có các trường cố định: tên, slug, tên ngắn, người phụ trách, địa điểm, liên hệ, giới thiệu ngắn và chi tiết, chức năng, nhiệm vụ, định hướng nghiên cứu, ghi chú bổ sung, ảnh bìa và mẫu hiển thị. Sheet `ResearchAreas`, `Equipment`, `Courses`, `Publications` là các mảng bản ghi; `Equipment` có tên, số lượng, mô tả, `imageId`, `imageAlt`; `Courses.level` là `UNDERGRADUATE` hoặc `POSTGRADUATE`. Hồ sơ cũ được đọc sang trường `content`; trang public hiển thị từ các trường cố định và giữ `sections` lịch sử để đối chiếu. CMS có 6 chủ đề, tạo mới theo từng bước.

## Mẫu hội thảo

Sheet `Events` có tiêu đề, slug, tóm tắt, ngày bắt đầu/kết thúc, địa điểm, đơn vị tổ chức, chủ đề, hình thức (`IN_PERSON`, `ONLINE`, `HYBRID`), đối tượng tham dự, link đăng ký, link nguồn, ảnh và `articleId`. Sheet `Speakers` chứa diễn giả, chức danh, đơn vị, chủ đề trình bày; `Sessions` chứa thời gian, tên phiên, diễn giả và mô tả. Mỗi hàng trong sheet phụ dùng `key` của hội thảo. CMS có 6 chủ đề và vẫn gắn một bài viết công khai để trình bày nội dung dài.

## Mẫu nghiên cứu

Sheet `Research` chứa metadata công trình: tiêu đề, slug, tóm tắt, năm, nơi công bố, nhà xuất bản, tập/số, DOI, ISBN, danh sách tác giả nguyên văn, trích dẫn, nguồn/tài liệu, cấp, thời gian, tiến độ, ảnh bìa và bài nguồn. `title` và `slug` bắt buộc. Sheet `Contributors` có thể có nhiều tác giả cho mỗi `key`. `role`: `AUTHOR`, `EDITOR`, `PRINCIPAL_INVESTIGATOR`, `MEMBER`. `staffSlug` liên kết tới **hồ sơ cán bộ đã công khai cùng ngôn ngữ**; để trống cho tác giả ngoài đơn vị. `name` và `role` bắt buộc. Nếu `authorsText` trống, import ghép tên từ `Contributors`. Màn hình nghiên cứu đang mở quyết định loại bản ghi và ngôn ngữ cho cả lô.

## Mẫu chương trình đào tạo

Sheet `Programs` có `key`, `code`, `locale` (`vi`/`en`), `level` (`UNDERGRADUATE`, `MASTER`, `DOCTORATE`), tiêu đề, slug, tóm tắt, giới thiệu, `degree` (`BACHELOR`, `ENGINEER`, `MASTER`, `DOCTOR`), đơn vị, thời lượng, tín chỉ, liên hệ, ảnh, nguồn. `code`, `locale`, `level`, `title`, `slug`, `degree` bắt buộc. Sheet `Outcomes`, `Careers`, `Curricula`, `Accreditations`, `Resources` chứa các danh sách tương ứng. `Courses` gắn học phần với `curriculumKey` từ `Curricula`. `curriculumKey` phải duy nhất trong mỗi chương trình. Ngày dùng `YYYY-MM-DD`; `current` và `elective` dùng `true` hoặc `false`; tín chỉ học phần có tối đa một chữ số thập phân. Ảnh dùng UUID đã tải lên thư viện CMS; file Excel không nhúng ảnh.

## Giới hạn và xử lý lỗi

- Chỉ nhận `.xlsx` tối đa 10 MB, tối đa 500 bản ghi chính và 5.000 hàng mỗi sheet. Không nhận công thức hoặc tên sheet/cột khác mẫu.
- `key`, slug và mã chương trình không được trùng trong file. Sheet phụ tham chiếu key không có ở sheet chính sẽ bị từ chối.
- Server kiểm tra quyền `directory:manage`, `editorial:manage`, `research:manage` hoặc `academics:manage` và áp dụng mọi kiểm tra domain hiện có, gồm slug/mã trùng trong cơ sở dữ liệu, liên kết cán bộ công khai, liên kết bài viết hội thảo và quyền dùng ảnh.
- Import dùng một transaction: nếu có lỗi, toàn bộ lô được hủy. Màn hình báo dòng/sheet của lỗi định dạng; sửa file và nhập lại. Import thành công trả số lượng và ID bản nháp.
- Import là thao tác **tạo mới**. Muốn sửa bản ghi đã có, mở bản nháp trong CMS. Không tự đăng công khai.

API: `GET /api/v1/admin/people/spreadsheet/template`, `POST /api/v1/admin/people/spreadsheet/import?locale=vi`; tương tự `/admin/laboratories/spreadsheet`, `/admin/editorial/events/spreadsheet`, `/admin/research/spreadsheet` với `kind` và `locale`, và `/admin/academics/programs/spreadsheet`. POST nhận multipart field `file` và tham số như trên.
