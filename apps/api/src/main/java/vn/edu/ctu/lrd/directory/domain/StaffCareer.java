package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record StaffCareer(String period, String institution, String role, String description) {
    public StaffCareer {
        period = StaffAcademicInfo.clean(period); institution = StaffAcademicInfo.clean(institution);
        role = StaffAcademicInfo.clean(role); description = StaffAcademicInfo.clean(description);
        require(period.length() <= 120 && institution.length() <= 300 && role.length() <= 200
                        && description.length() <= 3000, "INVALID_STAFF", "Quá trình công tác vượt giới hạn.");
    }
    public boolean filled() { return !period.isBlank() || !institution.isBlank() || !role.isBlank() || !description.isBlank(); }
}
