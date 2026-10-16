package vn.edu.ctu.lrd.integrations.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import vn.edu.ctu.lrd.integrations.application.GeminiSettingsService;
import vn.edu.ctu.lrd.integrations.application.port.GeminiProbe;
import vn.edu.ctu.lrd.integrations.application.port.GeminiSettingsRepository;

import java.time.Clock;
import vn.edu.ctu.lrd.platform.api.AuditLog;

@Configuration
public class GeminiSettingsConfiguration {
    @Bean
    GeminiSettingsService geminiSettingsService(GeminiSettingsRepository repository, GeminiProbe probe, Clock clock, AuditLog audit) {
        return new GeminiSettingsService(repository, probe, clock, audit);
    }
}
