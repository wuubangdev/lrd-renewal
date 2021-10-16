package vn.edu.ctu.lrd.identity.domain;

import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Instant;
import java.util.UUID;

public record PasswordReset(
        UUID id,
        UUID accountId,
        String tokenHash,
        long authVersion,
        Instant expiresAt,
        Instant usedAt,
        UUID createdBy,
        Instant createdAt) {
    public PasswordReset consume(Account account, Instant now) {
        DomainException.require(
                usedAt == null
                        && now.isBefore(expiresAt)
                        && account.active()
                        && account.id().equals(accountId)
                        && account.authVersion() == authVersion,
                "INVALID_RESET",
                "Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu quản trị viên cấp lại.");
        return new PasswordReset(
                id, accountId, tokenHash, authVersion, expiresAt, now, createdBy, createdAt);
    }
}
