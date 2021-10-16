package vn.edu.ctu.lrd.platform.api;

import java.util.UUID;

public interface AuditLog {
    void record(UUID actor, String action, UUID resource);

    void record(UUID actor, String action, UUID resource, java.util.Map<String, String> details);
}
