package vn.edu.ctu.lrd.research.adapters.out;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.lrd.research.application.port.ResearchRepository;
import vn.edu.ctu.lrd.research.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class ResearchPersistence implements ResearchRepository {
    private final JdbcClient jdbc;
    private final ObjectMapper json;
    public ResearchPersistence(JdbcClient jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    private ResearchDetails decode(String value) {
        if (value == null) return null;
        try { return json.readValue(value, ResearchDetails.class); }
        catch (tools.jackson.core.JacksonException ex) { throw new DomainException("INVALID_RESEARCH", "Không thể đọc bản ghi nghiên cứu."); }
    }
    private ResearchRecord row(ResultSet r, int ignored) throws SQLException {
        var published = r.getObject("published_at", OffsetDateTime.class);
        return new ResearchRecord((UUID) r.getObject("id"), ResearchKind.valueOf(r.getString("kind")),
                r.getString("locale"), decode(r.getString("draft")), decode(r.getString("live")),
                r.getLong("version"), r.getLong("draft_version"), r.getObject("published_draft_version", Long.class),
                r.getObject("created_at", OffsetDateTime.class).toInstant(),
                r.getObject("updated_at", OffsetDateTime.class).toInstant(),
                published == null ? null : published.toInstant());
    }
    public ResearchRecord get(UUID id) {
        return jdbc.sql("select * from research.record where id=:id").param("id", id).query(this::row)
                .optional().orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy bản ghi nghiên cứu."));
    }
    public List<ResearchRecord> list(ResearchKind kind, String locale, boolean publicOnly, int page, int size) {
        return jdbc.sql("select * from research.record where kind=:kind and locale=:locale "
                + (publicOnly ? "and live is not null " : "")
                + "order by coalesce((live->>'year')::integer,(draft->>'year')::integer) desc nulls last, published_at desc nulls last, id limit :size offset :offset")
                .param("kind", kind.name()).param("locale", locale).param("size", size).param("offset", page * size)
                .query(this::row).list();
    }
    public long count(ResearchKind kind, String locale, boolean publicOnly) {
        return jdbc.sql("select count(*) from research.record where kind=:kind and locale=:locale "
                + (publicOnly ? "and live is not null" : ""))
                .param("kind", kind.name()).param("locale", locale).query(Long.class).single();
    }
    public List<ResearchRecord> byStaff(UUID staffId, String locale) {
        return jdbc.sql("select r.* from research.record r join research.record_contributor c on c.record_id=r.id "
                + "where c.staff_id=:staff and r.locale=:locale and r.live is not null "
                + "order by (r.live->>'year')::integer desc nulls last,r.published_at desc limit 300")
                .param("staff", staffId).param("locale", locale).query(this::row).list();
    }
    public Optional<ResearchRecord> published(String locale, String slug) {
        return jdbc.sql("select * from research.record where locale=:locale and live->>'slug'=:slug and live is not null")
                .param("locale", locale).param("slug", slug).query(this::row).optional();
    }
    public boolean slugTaken(String locale, String slug, UUID except) {
        return jdbc.sql("select count(*) from research.record where locale=:locale and (slug=:slug or live->>'slug'=:slug) and id<>:except")
                .param("locale", locale).param("slug", slug).param("except", except).query(Long.class).single() > 0;
    }
    public boolean sourceTaken(String sourceKey, UUID except) {
        return jdbc.sql("select count(*) from research.record where source_key=:source and id<>:except")
                .param("source", sourceKey).param("except", except).query(Long.class).single() > 0;
    }
    public void insert(ResearchRecord r) {
        jdbc.sql("""
                insert into research.record(id,kind,locale,slug,draft,version,draft_version,created_at,updated_at)
                values(:id,:kind,:locale,:slug,cast(:draft as jsonb),:version,:draftVersion,:created,:updated)
                """).param("id", r.id()).param("kind", r.kind().name()).param("locale", r.locale())
                .param("slug", r.draft().slug()).param("draft", json.writeValueAsString(r.draft()))
                .param("version", r.version()).param("draftVersion", r.draftVersion())
                .param("created", r.createdAt().atOffset(ZoneOffset.UTC))
                .param("updated", r.updatedAt().atOffset(ZoneOffset.UTC)).update();
    }
    public void save(ResearchRecord r, long expectedVersion) {
        var changed = jdbc.sql("""
                update research.record set slug=:slug,source_key=:source,draft=cast(:draft as jsonb),live=cast(:live as jsonb),
                  version=:version,draft_version=:draftVersion,published_draft_version=:publishedVersion,
                  updated_at=:updated,published_at=:published where id=:id and version=:expected
                """).param("id", r.id()).param("expected", expectedVersion).param("slug", r.draft().slug())
                .param("source", r.draft().sourceKey().isBlank() ? null : r.draft().sourceKey(), Types.VARCHAR)
                .param("draft", json.writeValueAsString(r.draft()))
                .param("live", r.live() == null ? null : json.writeValueAsString(r.live()), Types.VARCHAR)
                .param("version", r.version()).param("draftVersion", r.draftVersion())
                .param("publishedVersion", r.publishedDraftVersion(), Types.BIGINT)
                .param("updated", r.updatedAt().atOffset(ZoneOffset.UTC))
                .param("published", r.publishedAt() == null ? null : r.publishedAt().atOffset(ZoneOffset.UTC), Types.TIMESTAMP_WITH_TIMEZONE)
                .update();
        if (changed != 1) throw new DomainException("STALE_VERSION", "Bản ghi đã được sửa ở nơi khác.");
        jdbc.sql("delete from research.record_contributor where record_id=:id").param("id", r.id()).update();
        if (r.live() != null) {
            var contributors = r.live().contributors();
            for (int i = 0; i < contributors.size(); i++) {
                var c = contributors.get(i);
                if (c.staffId() != null) jdbc.sql("""
                        insert into research.record_contributor(record_id,staff_id,role,display_order)
                        values(:record,:staff,:role,:position)
                        """).param("record", r.id()).param("staff", c.staffId())
                        .param("role", c.role().name()).param("position", i).update();
            }
        }
    }
}
