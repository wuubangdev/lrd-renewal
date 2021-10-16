package vn.edu.ctu.lrd.identity.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.identity.application.port.*;
import vn.edu.ctu.lrd.identity.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

public final class IdentityService {
    public record ResetLink(String token, Instant expiresAt) {}

    public record Invitation(Account account, ResetLink reset) {}

    private final IdentityStore store;
    private final IdentityEffects effects;
    private final Clock clock;

    public IdentityService(IdentityStore store, IdentityEffects effects, Clock clock) {
        this.store = store;
        this.effects = effects;
        this.clock = clock;
    }

    public IdentityStore.Accounts list(Actor actor, String query, int page, int size) {
        actor.require("identity:manage");
        require(
                query.length() <= 200 && page >= 0 && page <= 100000 && size >= 1 && size <= 100,
                "INVALID_QUERY",
                "Bộ lọc không hợp lệ.");
        return store.search(query, page, size);
    }

    public Invitation invite(Actor actor, String email, String name, Role role) {
        actor.require("identity:manage");
        store.lockAdministration();
        var account =
                Account.invite(
                        email, name, role, effects.encode(effects.newToken()), clock.instant());
        require(
                store.findByEmail(account.email()).isEmpty(),
                "ACCOUNT_CONFLICT",
                "Email đã được sử dụng.");
        store.insert(account);
        effects.audit(actor.id(), "ACCOUNT_INVITED", account.id());
        return new Invitation(account, issueReset(actor, account));
    }

    public Account update(
            Actor actor,
            UUID id,
            String email,
            String name,
            Role role,
            boolean active,
            long expected) {
        actor.require("identity:manage");
        store.lockAdministration();
        var before = account(id);
        var after = before.update(email, name, role, active, expected);
        require(
                store.findByEmail(after.email()).map(a -> a.id().equals(id)).orElse(true),
                "ACCOUNT_CONFLICT",
                "Email đã được sử dụng.");
        AdministrationPolicy.retainAdministrator(before, after, store.activeAdministrators());
        store.save(after);
        store.invalidateResets(id);
        effects.revokeSessions(before.email());
        effects.audit(actor.id(), "ACCOUNT_UPDATED", id);
        return after;
    }

    public Account revoke(Actor actor, UUID id, long expected) {
        actor.require("identity:manage");
        store.lockAdministration();
        var before = account(id);
        var after = before.revokeSessions(expected);
        store.save(after);
        store.invalidateResets(id);
        effects.revokeSessions(before.email());
        effects.audit(actor.id(), "SESSIONS_REVOKED", id);
        return after;
    }

    public ResetLink resetLink(Actor actor, UUID id, long expected) {
        actor.require("identity:manage");
        store.lockAdministration();
        var account = account(id);
        account.expect(expected);
        return issueReset(actor, account);
    }

    private ResetLink issueReset(Actor actor, Account account) {
        require(
                account.active(),
                "ACCOUNT_DISABLED",
                "Hãy mở khóa tài khoản trước khi cấp liên kết.");
        String token = effects.newToken();
        Instant now = clock.instant(), expires = now.plus(Duration.ofMinutes(30));
        store.invalidateResets(account.id());
        store.saveReset(
                new PasswordReset(
                        UUID.randomUUID(),
                        account.id(),
                        effects.hashToken(token),
                        account.authVersion(),
                        expires,
                        null,
                        actor.id(),
                        now));
        effects.audit(actor.id(), "PASSWORD_RESET_ISSUED", account.id());
        return new ResetLink(token, expires);
    }

    public void resetPassword(String token, String password) {
        require(
                token != null && token.matches("[A-Za-z0-9_-]{43}"),
                "INVALID_RESET",
                "Liên kết không hợp lệ hoặc đã hết hạn.");
        PasswordPolicy.validate(password);
        store.lockAdministration();
        var reset =
                store.findReset(effects.hashToken(token))
                        .orElseThrow(
                                () ->
                                        new DomainException(
                                                "INVALID_RESET",
                                                "Liên kết không hợp lệ hoặc đã hết hạn."));
        var account = account(reset.accountId());
        reset.consume(account, clock.instant());
        store.save(account.replacePassword(effects.encode(password)));
        store.invalidateResets(account.id());
        effects.revokeSessions(account.email());
        effects.audit(account.id(), "PASSWORD_RESET_COMPLETED", account.id());
    }

    public void changePassword(Actor actor, String current, String password) {
        PasswordPolicy.validate(password);
        store.lockAdministration();
        var account = account(actor.id());
        require(
                current != null
                        && current.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72
                        && effects.matches(current, account.passwordHash()),
                "INVALID_PASSWORD",
                "Mật khẩu hiện tại không đúng.");
        require(
                !effects.matches(password, account.passwordHash()),
                "WEAK_PASSWORD",
                "Hãy chọn mật khẩu khác mật khẩu hiện tại.");
        store.save(account.replacePassword(effects.encode(password)));
        store.invalidateResets(account.id());
        effects.revokeSessions(account.email());
        effects.audit(actor.id(), "PASSWORD_CHANGED", account.id());
    }

    private Account account(UUID id) {
        return store.findById(id)
                .orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy tài khoản."));
    }
}
