package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record StaffEducation(String degree, String period, String institution, String major,
        String graduationYear, String thesis, String mode) {
    public StaffEducation {
        degree = StaffAcademicInfo.clean(degree); period = StaffAcademicInfo.clean(period);
        institution = StaffAcademicInfo.clean(institution); major = StaffAcademicInfo.clean(major);
        graduationYear = StaffAcademicInfo.clean(graduationYear); thesis = StaffAcademicInfo.clean(thesis);
        mode = StaffAcademicInfo.clean(mode);
        require(degree.length() <= 120 && period.length() <= 120 && institution.length() <= 300
                        && major.length() <= 200 && graduationYear.length() <= 60
                        && thesis.length() <= 2000 && mode.length() <= 120,
                "INVALID_STAFF", "Thông tin đào tạo vượt giới hạn.");
    }
    public boolean filled() { return !degree.isBlank() || !institution.isBlank() || !major.isBlank() || !thesis.isBlank(); }
}
