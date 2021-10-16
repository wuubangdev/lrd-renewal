package vn.edu.ctu.lrd.platform.persistence;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.platform.api.AuditLog;

import java.time.Clock;
import java.util.UUID;

@Repository
@Transactional(propagation = Propagation.MANDATORY)
public class AuditPersistence implements AuditLog {
    private final JdbcClient jdbc;
    private final Clock clock;
    private final tools.jackson.databind.ObjectMapper json;

    public AuditPersistence(
            JdbcClient jdbc, Clock clock, tools.jackson.databind.ObjectMapper json) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.json = json;
    }

    public void record(UUID actor, String action, UUID resource) {
        record(actor, action, resource, java.util.Map.of());
    }

    public void record(
            UUID actor, String action, UUID resource, java.util.Map<String, String> details) {
        jdbc.sql(
                        "insert into"
                            + " platform.audit_event(id,actor_id,action,resource_id,occurred_at,details)"
                            + " values(:id,:actor,:action,:resource,:at,cast(:details as jsonb))")
                .param("id", UUID.randomUUID())
                .param("actor", actor)
                .param("action", action)
                .param("resource", resource)
                .param("at", java.sql.Timestamp.from(clock.instant()))
                .param("details", json.writeValueAsString(details))
                .update();
    }
}
