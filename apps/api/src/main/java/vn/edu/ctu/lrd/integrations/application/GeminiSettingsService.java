package vn.edu.ctu.lrd.integrations.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import vn.edu.ctu.lrd.integrations.api.GeminiSettingsCatalog;
import vn.edu.ctu.lrd.integrations.application.port.GeminiProbe;
import vn.edu.ctu.lrd.integrations.application.port.GeminiSettingsRepository;
import vn.edu.ctu.lrd.integrations.domain.GeminiSettings;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.platform.api.AuditLog;

import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

public class GeminiSettingsService implements GeminiSettingsCatalog {
    private final GeminiSettingsRepository repository;
    private final GeminiProbe probe;
    private final Clock clock;
    private final AuditLog audit;
    private static final UUID RESOURCE_ID = UUID.nameUUIDFromBytes("gemini-settings".getBytes(StandardCharsets.UTF_8));

    public GeminiSettingsService(GeminiSettingsRepository repository, GeminiProbe probe, Clock clock, AuditLog audit) {
        this.repository = repository;
        this.probe = probe;
        this.clock = clock;
        this.audit = audit;
    }

    public record View(String model, boolean configured, java.time.Instant updatedAt) {}

    public View view(Actor actor) {
        actor.require("integrations:manage");
        return viewOf(repository.load());
    }

    public View save(Actor actor, String model, String replacementKey) {
        actor.require("integrations:manage");
        var next = repository.load().configure(model, replacementKey, clock.instant());
        repository.save(next, actor.id());
        audit.record(actor.id(), "gemini.settings.updated", RESOURCE_ID, Map.of("model", next.model(), "keyReplaced", Boolean.toString(replacementKey != null && !replacementKey.isBlank())));
        return viewOf(next);
    }

    public View removeKey(Actor actor) {
        actor.require("integrations:manage");
        var next = repository.load().removeKey(clock.instant());
        repository.save(next, actor.id());
        audit.record(actor.id(), "gemini.settings.key_removed", RESOURCE_ID);
        return viewOf(next);
    }

    public void test(Actor actor, String model, String candidateKey) {
        actor.require("integrations:manage");
        var settings = repository.load().configure(model, candidateKey, clock.instant());
        require(settings.configured(), "AI_NOT_CONFIGURED", "Vui lòng nhập và lưu khóa API Gemini trước khi kiểm tra.");
        probe.test(settings.apiKey(), settings.model());
    }

    @Override
    public Credentials credentials() {
        var settings = repository.load();
        return settings.configured() ? new Credentials(settings.apiKey(), settings.model()) : null;
    }

    private static View viewOf(GeminiSettings settings) {
        return new View(settings.model(), settings.configured(), settings.updatedAt());
    }
}
