package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record LabCourse(String name, String code, Level level, String description) {
    public enum Level { UNDERGRADUATE, POSTGRADUATE }
    public LabCourse {
        name = LabContent.clean(name); code = LabContent.clean(code); description = LabContent.clean(description);
        require(level != null && name.length() <= 300 && code.length() <= 40 && description.length() <= 1000,
                "INVALID_LAB", "Học phần phòng thí nghiệm không hợp lệ.");
    }
}
