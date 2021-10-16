package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record StaffActivity(String title, String period, String organization, String role, String description, String url) {
    public StaffActivity {
        title = StaffAcademicInfo.clean(title); period = StaffAcademicInfo.clean(period);
        organization = StaffAcademicInfo.clean(organization); role = StaffAcademicInfo.clean(role);
        description = StaffAcademicInfo.clean(description); url = StaffAcademicInfo.clean(url);
        require(title.length() <= 1000 && period.length() <= 120 && organization.length() <= 300
                        && role.length() <= 200 && description.length() <= 10000 && url.length() <= 500,
                "INVALID_STAFF", "Thông tin học thuật vượt giới hạn.");
        require(url.isBlank() || url.startsWith("https://"), "INVALID_STAFF", "Liên kết học thuật phải dùng HTTPS.");
    }
    public boolean filled() { return !title.isBlank() || !description.isBlank(); }
}
