package vn.edu.ctu.lrd.identity.adapters.out.persistence;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import vn.edu.ctu.lrd.identity.application.port.IdentityStore;
import vn.edu.ctu.lrd.identity.domain.Account;
import vn.edu.ctu.lrd.identity.domain.PasswordReset;
import vn.edu.ctu.lrd.identity.domain.Role;

import java.util.Optional;
import java.util.UUID;

@Repository
public class AccountPersistence implements IdentityStore {
    private final JdbcClient jdbc;

    public AccountPersistence(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Account> findByEmail(String email) {
        return find("email", email);
    }

    public Optional<Account> findById(UUID id) {
        return find("id", id);
    }

    private Optional<Account> find(String column, Object value) {
        return jdbc.sql("select * from identity.account where " + column + " = :value")
                .param("value", value)
                .query(this::map)
                .optional();
    }

    public void insert(Account a) {
        jdbc.sql(
                        "insert into"
                            + " identity.account(id,email,display_name,password_hash,role,active,auth_version,created_at,version,password_set)"
                            + " values(:id,:email,:name,:password,:role,:active,:version,:created,:recordVersion,:passwordSet)")
                .param("id", a.id())
                .param("email", a.email())
                .param("name", a.displayName())
                .param("password", a.passwordHash())
                .param("role", a.role().name())
                .param("active", a.active())
                .param("version", a.authVersion())
                .param("created", java.sql.Timestamp.from(a.createdAt()))
                .param("recordVersion", a.version())
                .param("passwordSet", a.passwordSet())
                .update();
    }

    private Account map(java.sql.ResultSet r, int n) throws java.sql.SQLException {
        return new Account(
                r.getObject("id", UUID.class),
                r.getString("email"),
                r.getString("display_name"),
                r.getString("password_hash"),
                Role.valueOf(r.getString("role")),
                r.getBoolean("active"),
                r.getLong("auth_version"),
                r.getTimestamp("created_at").toInstant(),
                r.getLong("version"),
                r.getBoolean("password_set"));
    }

    public Accounts search(String query, int page, int size) {
        String term =
                "%"
                        + query.toLowerCase(java.util.Locale.ROOT)
                                .replace("!", "!!")
                                .replace("%", "!%")
                                .replace("_", "!_")
                        + "%";
        String where = " where lower(email || ' ' || display_name) like :q escape '!'";
        var items =
                jdbc.sql(
                                "select * from identity.account"
                                        + where
                                        + " order by created_at desc,id limit :size offset :offset")
                        .param("q", term)
                        .param("size", size)
                        .param("offset", (long) page * size)
                        .query(this::map)
                        .list();
        long total =
                jdbc.sql("select count(*) from identity.account" + where)
                        .param("q", term)
                        .query(Long.class)
                        .single();
        return new Accounts(items, total, page, size);
    }

    public void lockAdministration() {
        // One transaction lock serializes role/activation changes and password reset consumption.
        jdbc.sql("select pg_advisory_xact_lock(71234801)").query((r, n) -> 0).single();
    }

    public void save(Account a) {
        int changed =
                jdbc.sql(
                                "update identity.account set"
                                    + " email=:email,display_name=:name,password_hash=:password,"
                                    + "role=:role,active=:active,auth_version=:auth,version=:version,password_set=:passwordSet"
                                    + " where id=:id and version=:expected")
                        .param("email", a.email())
                        .param("name", a.displayName())
                        .param("password", a.passwordHash())
                        .param("role", a.role().name())
                        .param("active", a.active())
                        .param("auth", a.authVersion())
                        .param("version", a.version())
                        .param("passwordSet", a.passwordSet())
                        .param("id", a.id())
                        .param("expected", a.version() - 1)
                        .update();
        vn.edu.ctu.lrd.sharedkernel.DomainException.require(
                changed == 1, "STALE_VERSION", "Tài khoản đã thay đổi. Hãy tải lại.");
    }

    public long activeAdministrators() {
        return jdbc.sql(
                        "select count(*) from identity.account where active and password_set and"
                            + " role='ADMIN'")
                .query(Long.class)
                .single();
    }

    public void saveReset(PasswordReset r) {
        jdbc.sql(
                        "insert into"
                            + " identity.password_reset(id,account_id,token_hash,auth_version,expires_at,used_at,created_by,created_at)"
                            + " values(:id,:account,:hash,:version,:expires,:used,:actor,:created)")
                .param("id", r.id())
                .param("account", r.accountId())
                .param("hash", r.tokenHash())
                .param("version", r.authVersion())
                .param("expires", java.sql.Timestamp.from(r.expiresAt()))
                .param("used", r.usedAt() == null ? null : java.sql.Timestamp.from(r.usedAt()))
                .param("actor", r.createdBy())
                .param("created", java.sql.Timestamp.from(r.createdAt()))
                .update();
    }

    public Optional<PasswordReset> findReset(String hash) {
        return jdbc.sql("select * from identity.password_reset where token_hash=:hash")
                .param("hash", hash)
                .query(
                        (r, n) ->
                                new PasswordReset(
                                        r.getObject("id", UUID.class),
                                        r.getObject("account_id", UUID.class),
                                        r.getString("token_hash"),
                                        r.getLong("auth_version"),
                                        r.getTimestamp("expires_at").toInstant(),
                                        r.getTimestamp("used_at") == null
                                                ? null
                                                : r.getTimestamp("used_at").toInstant(),
                                        r.getObject("created_by", UUID.class),
                                        r.getTimestamp("created_at").toInstant()))
                .optional();
    }

    public void invalidateResets(UUID id) {
        jdbc.sql(
                        "update identity.password_reset set used_at=now() where account_id=:id and"
                            + " used_at is null")
                .param("id", id)
                .update();
    }
}
