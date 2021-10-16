package vn.edu.ctu.lrd.identity.application.port;

import vn.edu.ctu.lrd.identity.domain.Account;
import vn.edu.ctu.lrd.identity.domain.PasswordReset;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IdentityStore extends AccountRepository {
    record Accounts(List<Account> items, long total, int page, int size) {}

    Accounts search(String query, int page, int size);

    void lockAdministration();

    void save(Account account);

    long activeAdministrators();

    void saveReset(PasswordReset reset);

    Optional<PasswordReset> findReset(String tokenHash);

    void invalidateResets(UUID accountId);
}
