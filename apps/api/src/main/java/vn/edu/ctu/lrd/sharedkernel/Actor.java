package vn.edu.ctu.lrd.sharedkernel;

import java.util.Set;
import java.util.UUID;

public record Actor(UUID id, String name, Set<String> permissions) {
    public Actor {
        permissions = Set.copyOf(permissions);
    }

    public boolean can(String permission) {
        return permissions.contains(permission);
    }

    public void require(String permission) {
        DomainException.require(
                can(permission), "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    }
}
