package vn.edu.ctu.lrd.integrations.application.port;

import vn.edu.ctu.lrd.integrations.domain.GeminiSettings;

import java.util.UUID;

public interface GeminiSettingsRepository {
    GeminiSettings load();
    void save(GeminiSettings settings, UUID actorId);
}
