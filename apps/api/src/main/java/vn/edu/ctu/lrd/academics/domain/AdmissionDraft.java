package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.Instant;
import java.util.*;

public record AdmissionDraft(
        String title,
        String slug,
        String summary,
        String description,
        int year,
        List<Choice> programs,
        Instant opensAt,
        Instant closesAt,
        String applicationUrl,
        String requirements,
        String selectionMethod,
        List<Milestone> schedule,
        PublicContact contact,
        UUID coverId,
        String coverAlt,
        List<AcademicResource> resources,
        SourceReference source) {
    public record Choice(UUID programId, Integer quota) {
        public Choice {
            require(
                    programId != null && (quota == null || quota > 0 && quota <= 100000),
                    "INVALID_ADMISSION",
                    "Chương trình và chỉ tiêu (nếu có) phải hợp lệ.");
        }
    }

    public record Milestone(UUID id, String title, Instant at, String note) {
        public Milestone {
            require(id != null, "INVALID_ADMISSION", "Mốc thời gian cần mã định danh.");
            title = AcademicRules.text(title, 180);
            note = AcademicRules.text(note, 1000);
        }
    }

    public AdmissionDraft(
            String title,
            String slug,
            String summary,
            String description,
            int year,
            List<Choice> programs,
            Instant opensAt,
            Instant closesAt,
            String applicationUrl,
            String requirements,
            String selectionMethod,
            List<Milestone> schedule,
            PublicContact contact,
            UUID coverId,
            String coverAlt) {
        this(
                title,
                slug,
                summary,
                description,
                year,
                programs,
                opensAt,
                closesAt,
                applicationUrl,
                requirements,
                selectionMethod,
                schedule,
                contact,
                coverId,
                coverAlt,
                List.of(),
                null);
    }

    public AdmissionDraft {
        resources = AcademicResource.validated(resources);
        title = AcademicRules.text(title, 180);
        slug = AcademicRules.slug(slug);
        summary = AcademicRules.text(summary, 600);
        description = AcademicRules.text(description, 30000);
        applicationUrl = AcademicRules.https(applicationUrl);
        requirements = AcademicRules.text(requirements, 10000);
        selectionMethod = AcademicRules.text(selectionMethod, 10000);
        coverAlt = AcademicRules.text(coverAlt, 300);
        require(
                year >= 2000
                        && year <= 2200
                        && programs != null
                        && schedule != null
                        && contact != null,
                "INVALID_ADMISSION",
                "Năm hoặc cấu trúc đợt tuyển không hợp lệ.");
        programs = List.copyOf(programs);
        schedule = List.copyOf(schedule);
        require(
                programs.size() <= 30
                        && programs.stream().map(Choice::programId).distinct().count()
                                == programs.size()
                        && schedule.size() <= 30
                        && schedule.stream().map(Milestone::id).distinct().count()
                                == schedule.size(),
                "INVALID_ADMISSION",
                "Tối đa 30 chương trình/mốc thời gian, không trùng mã.");
        require(
                opensAt == null || closesAt == null || opensAt.isBefore(closesAt),
                "INVALID_WINDOW",
                "Mốc mở phải trước mốc đóng nhận hồ sơ.");
    }

    public static AdmissionDraft empty(int year) {
        return new AdmissionDraft(
                "",
                "",
                "",
                "",
                year,
                List.of(),
                null,
                null,
                "",
                "",
                "",
                List.of(),
                PublicContact.empty(),
                null,
                "");
    }

    public void validateForPublication() {
        require(
                title.length() >= 5
                        && !slug.isBlank()
                        && !summary.isBlank()
                        && description.length() >= 20
                        && !programs.isEmpty()
                        && !applicationUrl.isBlank(),
                "INVALID_ADMISSION",
                "Điền tên, đường dẫn, tóm tắt, giới thiệu, chương trình, thời gian và URL nộp hồ"
                        + " sơ.");
        require(
                opensAt != null && closesAt != null || source != null,
                "SOURCE_REQUIRED",
                "Thông báo chưa có lịch cần liên kết nguồn chính thức và ngày đối chiếu.");
        require(
                !requirements.isBlank() && !selectionMethod.isBlank(),
                "INVALID_ADMISSION",
                "Cần điều kiện dự tuyển và phương thức tuyển.");
        require(coverId == null || !coverAlt.isBlank(), "INVALID_ADMISSION", "Ảnh bìa cần mô tả.");
        schedule.forEach(
                m ->
                        require(
                                !m.title().isBlank() && m.at() != null,
                                "INVALID_ADMISSION",
                                "Mốc thời gian cần tên và thời điểm."));
        contact.validateForPublication();
    }

    public AdmissionDraft withDeadline(Instant deadline) {
        return new AdmissionDraft(
                title,
                slug,
                summary,
                description,
                year,
                programs,
                opensAt,
                deadline,
                applicationUrl,
                requirements,
                selectionMethod,
                schedule,
                contact,
                coverId,
                coverAlt,
                resources,
                source);
    }

    public Set<UUID> assetIds() {
        return coverId == null ? Set.of() : Set.of(coverId);
    }
}
