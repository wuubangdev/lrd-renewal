package vn.edu.ctu.lrd.identity.adapters.in.security;

import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import vn.edu.ctu.lrd.identity.domain.Account;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;

public class CmsPrincipal implements UserDetails, CredentialsContainer, Serializable {
    @Serial private static final long serialVersionUID = 1L;
    public final UUID id;
    public final String name;
    public final String email;
    public final Set<String> permissions;
    public final long authVersion;
    private final boolean active;
    private String password;

    public CmsPrincipal(Account a) {
        id = a.id();
        name = a.displayName();
        email = a.email();
        permissions = a.role().permissions();
        authVersion = a.authVersion();
        active = a.active() && a.passwordSet();
        password = a.passwordHash();
    }

    public Collection<? extends GrantedAuthority> getAuthorities() {
        return permissions.stream().map(SimpleGrantedAuthority::new).toList();
    }

    public String getPassword() {
        return password;
    }

    public String getUsername() {
        return email;
    }

    public boolean isEnabled() {
        return active;
    }

    public void eraseCredentials() {
        password = null;
    }
}
