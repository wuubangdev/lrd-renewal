package vn.edu.ctu.lrd.identity.domain;

import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.nio.charset.StandardCharsets;

public final class PasswordPolicy {
    private PasswordPolicy() {}

    public static void validate(String password) {
        DomainException.require(
                password != null
                        && password.codePointCount(0, password.length()) >= 12
                        && password.getBytes(StandardCharsets.UTF_8).length <= 72
                        && !password.isBlank(),
                "WEAK_PASSWORD",
                "Mật khẩu cần ít nhất 12 ký tự và không quá 72 byte UTF-8.");
    }
}
