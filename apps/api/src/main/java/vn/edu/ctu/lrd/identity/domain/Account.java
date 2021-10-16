package vn.edu.ctu.lrd.identity.domain;

import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

public record Account(
        UUID id,
        String email,
        String displayName,
        String passwordHash,
        Role role,
        boolean active,
        long authVersion,
        Instant createdAt,
        long version,
        boolean passwordSet) {
    public Account {
        DomainException.require(
                email != null && displayName != null && role != null,
                "INVALID_ACCOUNT",
                "Vui lòng điền đủ thông tin tài khoản.");
        email = email.strip().toLowerCase(Locale.ROOT);
        displayName = displayName.strip();
        DomainException.require(
                email.length() <= 254
                        && email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")
                        && !displayName.isBlank()
                        && displayName.length() <= 120,
                "INVALID_ACCOUNT",
                "Thông tin tài khoản không hợp lệ.");
    }

    public Account(
            UUID id,
            String email,
            String displayName,
            String passwordHash,
            Role role,
            boolean active,
            long authVersion,
            Instant createdAt) {
        this(id, email, displayName, passwordHash, role, active, authVersion, createdAt, 0, true);
    }

    public static Account invite(
            String email, String name, Role role, String unusableHash, Instant now) {
        return new Account(
                UUID.randomUUID(), email, name, unusableHash, role, true, 0, now, 0, false);
    }

    public void expect(long expected) {
        DomainException.require(
                version == expected,
                "STALE_VERSION",
                "Tài khoản đã được cập nhật. Hãy tải lại trước khi tiếp tục.");
    }

    public Account update(String email, String name, Role role, boolean active, long expected) {
        expect(expected);
        return new Account(
                id,
                email,
                name,
                passwordHash,
                role,
                active,
                authVersion + 1,
                createdAt,
                version + 1,
                passwordSet);
    }

    public Account replacePassword(String hash) {
        DomainException.require(active, "INVALID_RESET", "Tài khoản đang bị khóa.");
        return new Account(
                id,
                email,
                displayName,
                hash,
                role,
                active,
                authVersion + 1,
                createdAt,
                version + 1,
                true);
    }

    public Account revokeSessions(long expected) {
        expect(expected);
        return new Account(
                id,
                email,
                displayName,
                passwordHash,
                role,
                active,
                authVersion + 1,
                createdAt,
                version + 1,
                passwordSet);
    }

    public boolean isActiveAdministrator() {
        return active && passwordSet && role == Role.ADMIN;
    }

    public Account disable() {
        return update(email, displayName, role, false, version);
    }

    public Account changeRole(Role newRole) {
        return update(email, displayName, newRole, active, version);
    }
}
