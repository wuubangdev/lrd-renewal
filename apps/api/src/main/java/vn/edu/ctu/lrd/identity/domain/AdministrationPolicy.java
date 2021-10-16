package vn.edu.ctu.lrd.identity.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public final class AdministrationPolicy {
    private AdministrationPolicy() {}

    public static void retainAdministrator(
            Account before, Account after, long activeAdministrators) {
        require(
                !before.isActiveAdministrator()
                        || after.isActiveAdministrator()
                        || activeAdministrators > 1,
                "LAST_ADMIN",
                "Cần giữ ít nhất một quản trị viên đã kích hoạt để quản lý hệ thống.");
    }
}
