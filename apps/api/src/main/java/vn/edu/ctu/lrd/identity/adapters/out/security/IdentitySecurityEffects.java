package vn.edu.ctu.lrd.identity.adapters.out.security;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import vn.edu.ctu.lrd.identity.application.port.IdentityEffects;
import vn.edu.ctu.lrd.platform.api.AuditLog;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;

@Component
public class IdentitySecurityEffects implements IdentityEffects {
    private final PasswordEncoder encoder;
    private final JdbcClient jdbc;
    private final AuditLog audit;
    private final SecureRandom random = new SecureRandom();

    public IdentitySecurityEffects(PasswordEncoder encoder, JdbcClient jdbc, AuditLog audit) {
        this.encoder = encoder;
        this.jdbc = jdbc;
        this.audit = audit;
    }

    public String encode(String password) {
        return encoder.encode(password);
    }

    public boolean matches(String password, String hash) {
        return encoder.matches(password, hash);
    }

    public String newToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashToken(String token) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public void revokeSessions(String email) {
        jdbc.sql("delete from identity.spring_session where principal_name=:email")
                .param("email", email)
                .update();
    }

    public void audit(UUID actor, String action, UUID account) {
        audit.record(actor, action, account);
    }
}
