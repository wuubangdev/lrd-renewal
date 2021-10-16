package vn.edu.ctu.lrd.directory.adapters.out;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.lrd.directory.application.port.StaffRepository;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class StaffPersistence implements StaffRepository {
    private final JdbcClient jdbc;
    private final ObjectMapper json;
    public StaffPersistence(JdbcClient jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

    private StaffDetails decode(String value) {
        if (value == null) return null;
        try { return json.readValue(value, StaffDetails.class); }
        catch (tools.jackson.core.JacksonException ex) {
            throw new DomainException("INVALID_STAFF", "Không thể đọc dữ liệu hồ sơ cán bộ.");
        }
    }
    private StaffProfile row(ResultSet r, int ignored) throws SQLException {
        return new StaffProfile((UUID) r.getObject("id"), r.getString("locale"),
                decode(r.getString("draft")), decode(r.getString("live")), r.getLong("version"),
                r.getLong("draft_version"), r.getObject("published_draft_version", Long.class),
                r.getObject("created_at", OffsetDateTime.class).toInstant(),
                r.getObject("updated_at", OffsetDateTime.class).toInstant(),
                r.getObject("published_at", OffsetDateTime.class) == null ? null :
                        r.getObject("published_at", OffsetDateTime.class).toInstant());
    }
    public StaffProfile get(UUID id) {
        return jdbc.sql("select * from directory.staff_profile where id=:id").param("id", id)
                .query(this::row).optional().orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy cán bộ."));
    }
    public Optional<StaffProfile> published(String locale, String slug) {
        return jdbc.sql("select * from directory.staff_profile where locale=:locale and live->>'slug'=:slug and live is not null")
                .param("locale", locale).param("slug", slug).query(this::row).optional();
    }
    public List<StaffProfile> list(String locale, boolean publicOnly) {
        return jdbc.sql("select * from directory.staff_profile where locale=:locale "
                        + (publicOnly ? "and live is not null " : "")
                        + "order by coalesce(live->>'name',draft->>'name'), id")
                .param("locale", locale).query(this::row).list();
    }
    public boolean slugTaken(String locale, String slug, UUID except) {
        return jdbc.sql("select count(*) from directory.staff_profile where locale=:locale and (slug=:slug or live->>'slug'=:slug) and id<>:except")
                .param("locale", locale).param("slug", slug).param("except", except)
                .query(Long.class).single() > 0;
    }
    public void insert(StaffProfile p) {
        jdbc.sql("""
                insert into directory.staff_profile(id,locale,slug,draft,version,draft_version,created_at,updated_at)
                values(:id,:locale,:slug,cast(:draft as jsonb),:version,:draftVersion,:created,:updated)
                """).param("id", p.id()).param("locale", p.locale()).param("slug", p.draft().slug())
                .param("draft", json.writeValueAsString(p.draft())).param("version", p.version())
                .param("draftVersion", p.draftVersion())
                .param("created", p.createdAt().atOffset(ZoneOffset.UTC))
                .param("updated", p.updatedAt().atOffset(ZoneOffset.UTC)).update();
    }
    public void save(StaffProfile p, long expectedVersion) {
        var changed = jdbc.sql("""
                update directory.staff_profile set slug=:slug,draft=cast(:draft as jsonb),live=cast(:live as jsonb),
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
