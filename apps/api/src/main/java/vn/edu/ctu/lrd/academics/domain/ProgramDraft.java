package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.util.*;

public record ProgramDraft(
        String title,
        String slug,
        String summary,
        String description,
        Degree degree,
        String unit,
        Integer durationMonths,
        Integer credits,
        List<String> outcomes,
        List<String> careers,
        PublicContact contact,
        UUID coverId,
        String coverAlt,
        List<CurriculumVersion> curricula,
        List<Accreditation> accreditations,
        List<AcademicResource> resources,
        SourceReference source) {
    public enum Degree {
        BACHELOR,
        ENGINEER,
        MASTER,
        DOCTOR
    }

    public ProgramDraft(
            String title,
            String slug,
            String summary,
            String description,
            Degree degree,
            String unit,
            Integer durationMonths,
            Integer credits,
            List<String> outcomes,
            List<String> careers,
            PublicContact contact,
            UUID coverId,
            String coverAlt,
            List<CurriculumVersion> curricula,
            List<Accreditation> accreditations) {
        this(
                title,
                slug,
                summary,
                description,
                degree,
                unit,
                durationMonths,
                credits,
                outcomes,
                careers,
                contact,
                coverId,
                coverAlt,
                curricula,
                accreditations,
                List.of(),
                null);
    }

    public ProgramDraft {
        resources = AcademicResource.validated(resources);
        title = AcademicRules.text(title, 180);
        slug = AcademicRules.slug(slug);
        summary = AcademicRules.text(summary, 600);
        description = AcademicRules.text(description, 30000);
        unit = AcademicRules.text(unit, 180);
        coverAlt = AcademicRules.text(coverAlt, 300);
        require(
                degree != null && contact != null && curricula != null && accreditations != null,
                "INVALID_PROGRAM",
                "Thiếu cấu trúc chương trình.");
        require(
                (durationMonths == null || durationMonths > 0 && durationMonths <= 240)
                        && (credits == null || credits > 0 && credits <= 1000),
                "INVALID_PROGRAM",
                "Thời lượng và tín chỉ phải dương nếu được khai báo.");
        outcomes = AcademicRules.lines(outcomes);
        careers = AcademicRules.lines(careers);
        curricula = List.copyOf(curricula);
        accreditations = List.copyOf(accreditations);
        require(
                curricula.size() <= 20 && accreditations.size() <= 20,
                "INVALID_PROGRAM",
                "Tối đa 20 khung chương trình và 20 chứng nhận mỗi phiên bản.");
        require(
                curricula.stream().map(CurriculumVersion::id).distinct().count() == curricula.size()
                        && accreditations.stream().map(Accreditation::id).distinct().count()
                                == accreditations.size(),
                "INVALID_PROGRAM",
                "Mã khung chương trình/chứng nhận bị trùng.");
        var current = new HashSet<String>();
        curricula.stream()
                .filter(CurriculumVersion::current)
                .forEach(
                        c ->
                                require(
                                        current.add(c.cohort().toLowerCase(Locale.ROOT)),
                                        "INVALID_CURRICULUM",
                                        "Mỗi khóa áp dụng chỉ có một khung hiện hành."));
    }

    public static ProgramDraft empty(EducationLevel level) {
        return new ProgramDraft(
                "",
                "",
                "",
                "",
                switch (level) {
                    case UNDERGRADUATE -> Degree.BACHELOR;
                    case MASTER -> Degree.MASTER;
                    case DOCTORATE -> Degree.DOCTOR;
                },
                "Bộ môn Tài nguyên Đất đai",
                null,
                null,
                List.of(),
                List.of(),
                PublicContact.empty(),
                null,
                "",
                List.of(),
                List.of());
    }

    public void validateForPublication(EducationLevel level) {
        require(
                title.length() >= 5
                        && !slug.isBlank()
                        && !summary.isBlank()
                        && description.length() >= 20
                        && !unit.isBlank(),
                "INVALID_PROGRAM",
                "Cần tên, đường dẫn, tóm tắt, đơn vị và giới thiệu ít nhất 20 ký tự.");
        require(
                switch (level) {
                    case UNDERGRADUATE -> degree == Degree.BACHELOR || degree == Degree.ENGINEER;
                    case MASTER -> degree == Degree.MASTER;
                    case DOCTORATE -> degree == Degree.DOCTOR;
                },
                "INVALID_PROGRAM",
                "Văn bằng không phù hợp với bậc đào tạo.");
        require(coverId == null || !coverAlt.isBlank(), "INVALID_PROGRAM", "Ảnh bìa cần mô tả.");
        require(
                outcomes.stream().noneMatch(String::isBlank)
                        && careers.stream().noneMatch(String::isBlank),
                "INVALID_PROGRAM",
                "Danh sách chuẩn đầu ra/nghề nghiệp có mục để trống.");
        contact.validateForPublication();
        curricula.forEach(CurriculumVersion::validateForPublication);
        accreditations.forEach(Accreditation::validateForPublication);
    }

    public Set<UUID> assetIds() {
        return coverId == null ? Set.of() : Set.of(coverId);
    }
}
