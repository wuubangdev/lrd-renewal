package vn.edu.ctu.lrd;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

import vn.edu.ctu.lrd.identity.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Instant;
import java.util.UUID;

class IdentityDomainTest {
    private final Instant now = Instant.parse("2026-10-15T00:00:00Z");

    @Test
    void invitationOnlyBecomesAnActiveAdministratorAfterSettingPassword() {
        var account = Account.invite(" ADMIN@ctu.edu.vn ", "Admin", Role.ADMIN, "unusable", now);
        assertThat(account.email()).isEqualTo("admin@ctu.edu.vn");
        assertThat(account.isActiveAdministrator()).isFalse();
        var activated = account.replacePassword("new-hash");
        assertThat(activated.isActiveAdministrator()).isTrue();
        assertThat(activated.authVersion()).isEqualTo(1);
        assertThat(activated.version()).isEqualTo(1);
        assertThatThrownBy(
                        () -> activated.update(activated.email(), "Changed", Role.AUTHOR, true, 0))
                .isInstanceOf(DomainException.class);
        assertThat(activated.changeRole(Role.EDITOR).authVersion()).isEqualTo(2);
    }

    @Test
    void resetIsSingleUseTimeLimitedAndBoundToCredentialGeneration() {
        var account = Account.invite("test@ctu.edu.vn", "Test", Role.AUTHOR, "hash", now);
        var reset =
                new PasswordReset(
                        UUID.randomUUID(),
                        account.id(),
                        "hash",
                        0,
                        now.plusSeconds(1800),
                        null,
                        account.id(),
                        now);
        var used = reset.consume(account, now.plusSeconds(1799));
        assertThatThrownBy(() -> used.consume(account, now.plusSeconds(1799)))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> reset.consume(account, now.plusSeconds(1800)))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> reset.consume(account.replacePassword("new"), now))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> reset.consume(account.disable(), now))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void passwordLimitsAreUnicodeAndBcryptByteAware() {
        assertThatCode(() -> PasswordPolicy.validate("Một cụm từ đủ dài!"))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> PasswordPolicy.validate("short"))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> PasswordPolicy.validate("ấ".repeat(25)))
                .isInstanceOf(DomainException.class);
    }
}
