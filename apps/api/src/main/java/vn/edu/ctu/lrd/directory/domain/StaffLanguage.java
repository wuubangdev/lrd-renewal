package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record StaffLanguage(String language, String proficiency, String certificate) {
    public StaffLanguage {
        language = StaffAcademicInfo.clean(language);
        proficiency = StaffAcademicInfo.clean(proficiency);
        certificate = StaffAcademicInfo.clean(certificate);
        require(language.length() <= 120 && proficiency.length() <= 200 && certificate.length() <= 200,
                "INVALID_STAFF", "Thông tin ngoại ngữ vượt giới hạn.");
    }
}
