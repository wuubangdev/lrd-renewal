package vn.edu.ctu.lrd.identity.domain;

import java.util.HashSet;
import java.util.Set;

public enum Role {
    AUTHOR,
    EDITOR,
    ADMIN;

    public Set<String> permissions() {
        var permissions =
                new HashSet<>(
                        Set.of(
                                "content:create",
                                "content:update:own",
                                "content:publish:own",
                                "media:upload"));
        if (this != AUTHOR)
            permissions.addAll(
                    Set.of(
                            "content:update:any",
                            "content:publish:any",
                            "media:manage",
                            "academics:manage",
                            "directory:manage",
                            "editorial:manage",
                            "research:manage"));
        if (this == ADMIN)
            permissions.addAll(Set.of("identity:manage", "site:manage", "audit:read", "integrations:manage"));
        return Set.copyOf(permissions);
    }
}
