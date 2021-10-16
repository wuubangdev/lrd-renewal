package vn.edu.ctu.lrd.directory.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public record StaffFact(String label, String value) {
    public StaffFact {
        label = label == null ? "" : label.strip();
        value = value == null ? "" : value.strip();
        require(!label.isBlank() && label.length() <= 160 && value.length() <= 10000,
                "INVALID_STAFF", "Thuộc tính hồ sơ không hợp lệ.");
    }
}
