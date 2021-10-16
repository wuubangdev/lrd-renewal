package vn.edu.ctu.lrd.academics.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record PublicContact(String name, String email, String phone) {
    public PublicContact {
        name = AcademicRules.text(name, 160);
        email = AcademicRules.text(email, 254);
        phone = AcademicRules.text(phone, 50);
        require(
                email.isEmpty() || email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"),
                "INVALID_CONTACT",
                "Email liên hệ không hợp lệ.");
    }

    public void validateForPublication() {
        require(
                !name.isBlank() && !email.isBlank(),
                "INVALID_CONTACT",
                "Cần tên và email đầu mối liên hệ.");
    }

    public static PublicContact empty() {
        return new PublicContact("", "", "");
    }
}
