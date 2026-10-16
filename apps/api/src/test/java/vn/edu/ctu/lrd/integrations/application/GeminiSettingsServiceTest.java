package vn.edu.ctu.lrd.integrations.application;

import org.junit.jupiter.api.Test;
import vn.edu.ctu.lrd.integrations.application.port.GeminiProbe;
import vn.edu.ctu.lrd.integrations.application.port.GeminiSettingsRepository;
import vn.edu.ctu.lrd.integrations.domain.GeminiSettings;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Clock;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class GeminiSettingsServiceTest {
    @Test
    void testsUnsavedCredentialsAndRestrictsSettingsToAdmins() {
        var repository = new MemoryRepository();
        var probe = new RecordingProbe();
        var audit = new AuditLog() {
            public void record(UUID actor, String action, UUID resource) {}
            public void record(UUID actor, String action, UUID resource, Map<String, String> details) {}
        };
        var service = new GeminiSettingsService(repository, probe, Clock.systemUTC(), audit);
        var admin = new Actor(UUID.randomUUID(), "Admin", Set.of("integrations:manage"));
        var editor = new Actor(UUID.randomUUID(), "Editor", Set.of("content:create"));
        assertThrows(DomainException.class, () -> service.view(editor));
        service.test(admin, "gemini-2.5-flash", "unsaved-key");
        assertEquals("unsaved-key", probe.key);
        assertNull(service.credentials());
        var saved = service.save(admin, "gemini-2.5-flash", "stored-key");
        assertTrue(saved.configured());
        assertFalse(saved.toString().contains("stored-key"));
        service.test(admin, "gemini-2.5-flash-lite", "");
        assertEquals("stored-key", probe.key);
        assertEquals("gemini-2.5-flash-lite", probe.model);
        service.removeKey(admin);
        assertNull(service.credentials());
    }

    static class MemoryRepository implements GeminiSettingsRepository {
        GeminiSettings settings = GeminiSettings.empty();
        public GeminiSettings load() { return settings; }
        public void save(GeminiSettings settings, UUID actorId) { this.settings = settings; }
    }

    static class RecordingProbe implements GeminiProbe {
        String key;
        String model;
        public void test(String key, String model) { this.key = key; this.model = model; }
    }
}
