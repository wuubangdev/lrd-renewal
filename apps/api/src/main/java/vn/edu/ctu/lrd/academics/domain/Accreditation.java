package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.time.LocalDate;
import java.util.UUID;

public record Accreditation(
        UUID id,
        String name,
        String organization,
        LocalDate issuedAt,
        LocalDate expiresAt,
        String evidenceUrl) {
    public enum Validity {
        NOT_YET_VALID,
        VALID,
        EXPIRED,
        NO_EXPIRY_RECORDED
    }

    public Accreditation {
        require(id != null, "INVALID_ACCREDITATION", "Chứng nhận cần mã định danh.");
        name = AcademicRules.text(name, 180);
        organization = AcademicRules.text(organization, 180);
        evidenceUrl = AcademicRules.https(evidenceUrl);
        require(
                expiresAt == null || issuedAt == null || !expiresAt.isBefore(issuedAt),
                "INVALID_ACCREDITATION",
                "Ngày hết hạn chứng nhận không được trước ngày cấp.");
    }

    public void validateForPublication() {
        require(
                !name.isBlank()
                        && !organization.isBlank()
                        && issuedAt != null
                        && !evidenceUrl.isBlank(),
                "INVALID_ACCREDITATION",
                "Chứng nhận cần tên, tổ chức, ngày cấp và URL minh chứng.");
    }

    public Validity validityAt(LocalDate date) {
        if (issuedAt == null || date.isBefore(issuedAt)) return Validity.NOT_YET_VALID;
        if (expiresAt == null) return Validity.NO_EXPIRY_RECORDED;
        return date.isAfter(expiresAt) ? Validity.EXPIRED : Validity.VALID;
    }
}
