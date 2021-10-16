package vn.edu.ctu.lrd.directory.adapters.out;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.lrd.directory.application.port.LaboratoryRepository;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class LaboratoryPersistence implements LaboratoryRepository {
    private final JdbcClient jdbc;
    private final ObjectMapper json;
    public LaboratoryPersistence(JdbcClient jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    private LaboratoryDetails decode(String value) {
        if (value == null) return null;
        try { return json.readValue(value, LaboratoryDetails.class); }
        catch (tools.jackson.core.JacksonException ex) {
            throw new DomainException("INVALID_LAB", "Không thể đọc dữ liệu phòng thí nghiệm.");
        }
    }
    private LaboratoryProfile row(ResultSet r, int ignored) throws SQLException {
        var published = r.getObject("published_at", OffsetDateTime.class);
        return new LaboratoryProfile((UUID) r.getObject("id"), r.getString("locale"),
                decode(r.getString("draft")), decode(r.getString("live")), r.getLong("version"),
                r.getLong("draft_version"), r.getObject("published_draft_version", Long.class),
                r.getObject("created_at", OffsetDateTime.class).toInstant(),
                r.getObject("updated_at", OffsetDateTime.class).toInstant(),
                published == null ? null : published.toInstant());
    }
    public LaboratoryProfile get(UUID id) {
        return jdbc.sql("select * from directory.laboratory_profile where id=:id").param("id", id)
                .query(this::row).optional().orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy phòng thí nghiệm."));
    }
    public Optional<LaboratoryProfile> published(String locale, String slug) {
        return jdbc.sql("select * from directory.laboratory_profile where locale=:locale and live->>'slug'=:slug and live is not null")
                .param("locale", locale).param("slug", slug).query(this::row).optional();
    }
    public List<LaboratoryProfile> list(String locale, boolean publicOnly) {
        return jdbc.sql("select * from directory.laboratory_profile where locale=:locale "
                + (publicOnly ? "and live is not null " : "")
                + "order by coalesce(live->>'name',draft->>'name'), id")
                .param("locale", locale).query(this::row).list();
    }
    public boolean slugTaken(String locale, String slug, UUID except) {
        return jdbc.sql("select count(*) from directory.laboratory_profile where locale=:locale and (slug=:slug or live->>'slug'=:slug) and id<>:except")
                .param("locale", locale).param("slug", slug).param("except", except)
                .query(Long.class).single() > 0;
    }
    public void insert(LaboratoryProfile p) {
        jdbc.sql("""
                insert into directory.laboratory_profile(id,locale,slug,draft,version,draft_version,created_at,updated_at)
                values(:id,:locale,:slug,cast(:draft as jsonb),:version,:draftVersion,:created,:updated)
                """).param("id", p.id()).param("locale", p.locale()).param("slug", p.draft().slug())
                .param("draft", json.writeValueAsString(p.draft())).param("version", p.version())
                .param("draftVersion", p.draftVersion())
                .param("created", p.createdAt().atOffset(ZoneOffset.UTC))
                .param("updated", p.updatedAt().atOffset(ZoneOffset.UTC)).update();
    }
    public void save(LaboratoryProfile p, long expectedVersion) {
        var changed = jdbc.sql("""
                update directory.laboratory_profile set slug=:slug,draft=cast(:draft as jsonb),live=cast(:live as jsonb),
                  version=:version,draft_version=:draftVersion,published_draft_version=:publishedVersion,
                  updated_at=:updated,published_at=:published where id=:id and version=:expected
                """).param("id", p.id()).param("expected", expectedVersion)
                .param("slug", p.draft().slug()).param("draft", json.writeValueAsString(p.draft()))
                .param("live", p.live() == null ? null : json.writeValueAsString(p.live()), Types.VARCHAR)
                .param("version", p.version()).param("draftVersion", p.draftVersion())
                .param("publishedVersion", p.publishedDraftVersion(), Types.BIGINT)
                .param("updated", p.updatedAt().atOffset(ZoneOffset.UTC))
                .param("published", p.publishedAt() == null ? null : p.publishedAt().atOffset(ZoneOffset.UTC), Types.TIMESTAMP_WITH_TIMEZONE)
                .update();
        if (changed != 1) throw new DomainException("STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
    }
}
