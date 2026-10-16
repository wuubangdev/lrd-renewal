package vn.edu.ctu.lrd.integrations.adapters.out.persistence;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.edu.ctu.lrd.integrations.application.port.GeminiSettingsRepository;
import vn.edu.ctu.lrd.integrations.domain.GeminiSettings;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Repository
public class GeminiSettingsPersistence implements GeminiSettingsRepository {
    private final JdbcClient jdbc;
    private final GeminiSecretCipher cipher;

    public GeminiSettingsPersistence(JdbcClient jdbc, GeminiSecretCipher cipher) {
        this.jdbc = jdbc;
        this.cipher = cipher;
    }

    @Override
    public GeminiSettings load() {
        return jdbc.sql("select model,encrypted_api_key,updated_at from platform.gemini_settings where id=1")
                .query((rs, row) -> new GeminiSettings(rs.getString("model"),
                        cipher.decrypt(rs.getBytes("encrypted_api_key")),
                        rs.getObject("updated_at", OffsetDateTime.class).toInstant()))
                .optional().orElseGet(GeminiSettings::empty);
    }

    @Override
    public void save(GeminiSettings settings, UUID actorId) {
        jdbc.sql("""
                insert into platform.gemini_settings(id,model,encrypted_api_key,updated_by,updated_at)
                values(1,:model,:secret,:actor,:updated)
                on conflict (id) do update set model=excluded.model,
                  encrypted_api_key=excluded.encrypted_api_key,updated_by=excluded.updated_by,
                  updated_at=excluded.updated_at
                """)
                .param("model", settings.model())
                .param("secret", cipher.encrypt(settings.apiKey()), java.sql.Types.BINARY)
                .param("actor", actorId)
                .param("updated", settings.updatedAt().atOffset(ZoneOffset.UTC))
                .update();
    }
}
