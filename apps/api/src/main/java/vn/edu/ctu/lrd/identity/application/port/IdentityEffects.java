package vn.edu.ctu.lrd.identity.application.port;

import java.util.UUID;

public interface IdentityEffects {
    String encode(String password);

    boolean matches(String password, String hash);

    String newToken();

    String hashToken(String token);

    void revokeSessions(String email);

    void audit(UUID actor, String action, UUID account);
}
