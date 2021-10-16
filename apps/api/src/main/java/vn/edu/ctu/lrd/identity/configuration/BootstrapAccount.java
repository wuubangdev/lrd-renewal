package vn.edu.ctu.lrd.identity.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import vn.edu.ctu.lrd.identity.application.port.IdentityStore;
import vn.edu.ctu.lrd.identity.domain.Account;
import vn.edu.ctu.lrd.identity.domain.Role;

import java.time.Clock;
import java.util.UUID;

@Configuration
public class BootstrapAccount {
    @Bean
    ApplicationRunner bootstrap(
            IdentityStore accounts,
            PasswordEncoder encoder,
            Clock clock,
            PlatformTransactionManager manager,
            @Value("${lrd.bootstrap.email}") String email,
            @Value("${lrd.bootstrap.password}") String password) {
        return args -> {
            if (email.isBlank() || password.isBlank()) return;
            if (password.length() < 16)
                throw new IllegalStateException(
                        "Bootstrap password must have at least 16 characters");
            new TransactionTemplate(manager)
                    .executeWithoutResult(
                            tx -> {
                                accounts.lockAdministration();
                                if (accounts.search("", 0, 1).total() == 0)
                                    accounts.insert(
                                            new Account(
                                                    UUID.randomUUID(),
                                                    email,
                                                    "Quản trị viên",
                                                    encoder.encode(password),
                                                    Role.ADMIN,
                                                    true,
                                                    0,
                                                    clock.instant()));
                            });
        };
    }
}
