package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public record CurriculumVersion(
        UUID id,
        String name,
        String cohort,
        boolean current,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        String documentUrl,
        List<Course> courses) {
    public record Course(
            UUID id, String code, String name, BigDecimal credits, int semester, boolean elective) {
        public Course {
            require(
                    id != null
                            && credits != null
                            && credits.signum() > 0
                            && credits.compareTo(new BigDecimal("30")) <= 0
                            && credits.scale() <= 1
                            && semester >= 1
                            && semester <= 16,
                    "INVALID_CURRICULUM",
                    "Học phần cần số tín chỉ dương (tối đa 30) và học kỳ 1–16.");
            code = AcademicRules.text(code, 30);
            name = AcademicRules.text(name, 180);
        }

        void validate() {
            require(
                    !code.isBlank() && !name.isBlank(),
                    "INVALID_CURRICULUM",
                    "Học phần cần mã và tên.");
        }
    }

    public CurriculumVersion {
        require(
                id != null && courses != null && courses.size() <= 150,
                "INVALID_CURRICULUM",
                "Khung chương trình có tối đa 150 học phần.");
        name = AcademicRules.text(name, 160);
        cohort = AcademicRules.text(cohort, 80);
        documentUrl = AcademicRules.https(documentUrl);
        courses = List.copyOf(courses);
        require(
                effectiveTo == null
                        || effectiveFrom == null
                        || !effectiveTo.isBefore(effectiveFrom),
                "INVALID_CURRICULUM",
                "Ngày kết thúc hiệu lực không được trước ngày bắt đầu.");
        require(
                courses.stream().map(Course::id).distinct().count() == courses.size()
                        && courses.stream()
                                        .map(c -> c.code().toUpperCase(Locale.ROOT))
                                        .distinct()
                                        .count()
                                == courses.size(),
                "INVALID_CURRICULUM",
                "Mã học phần bị trùng trong cùng khung chương trình.");
    }

    public void validateForPublication() {
        require(
                !name.isBlank() && !cohort.isBlank() && effectiveFrom != null,
                "INVALID_CURRICULUM",
                "Khung chương trình cần tên, khóa áp dụng và ngày hiệu lực.");
        require(
                !courses.isEmpty() || !documentUrl.isBlank(),
                "INVALID_CURRICULUM",
                "Bổ sung học phần hoặc liên kết tài liệu khung chương trình.");
        courses.forEach(Course::validate);
    }
}
