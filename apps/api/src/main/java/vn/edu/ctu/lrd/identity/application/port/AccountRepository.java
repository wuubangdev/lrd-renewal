package vn.edu.ctu.lrd.identity.application.port;

import vn.edu.ctu.lrd.identity.domain.Account;

import java.util.Optional;
import java.util.UUID;

public interface AccountRepository {
    Optional<Account> findByEmail(String email);

    Optional<Account> findById(UUID id);

    void insert(Account account);
}
