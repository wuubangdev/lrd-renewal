package vn.edu.ctu.lrd.editorial.adapters.out;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;
import vn.edu.ctu.lrd.editorial.application.port.EditorialRepository;
import vn.edu.ctu.lrd.editorial.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class EditorialPersistence implements EditorialRepository {
    private final JdbcClient jdbc;
    private final ObjectMapper json;
    public EditorialPersistence(JdbcClient jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    private EditorialDetails decode(String value) {
        if (value == null) return null;
        try { return json.readValue(value, EditorialDetails.class); }
        catch (tools.jackson.core.JacksonException ex) {
            throw new DomainException("INVALID_EDITORIAL", "Không thể đọc hồ sơ nội dung.");
        }
    }
    private EditorialItem row(ResultSet r, int ignored) throws SQLException {
        var published = r.getObject("published_at", OffsetDateTime.class);
        return new EditorialItem((UUID) r.getObject("id"), EditorialKind.valueOf(r.getString("kind")),
                r.getString("locale"), decode(r.getString("draft")), decode(r.getString("live")),
                r.getLong("version"), r.getLong("draft_version"), r.getObject("published_draft_version", Long.class),
                r.getObject("created_at", OffsetDateTime.class).toInstant(),
                r.getObject("updated_at", OffsetDateTime.class).toInstant(),
                published == null ? null : published.toInstant());
    }
    public EditorialItem get(UUID id) {
        return jdbc.sql("select * from editorial.item where id=:id").param("id", id).query(this::row)
                .optional().orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy hồ sơ nội dung."));
    }
    public List<EditorialItem> list(EditorialKind kind, String locale, boolean publicOnly) {
        return jdbc.sql("select * from editorial.item where kind=:kind and locale=:locale "
                + (publicOnly ? "and live is not null " : "")
                + "order by published_at desc nulls last, updated_at desc, id")
                .param("kind", kind.name()).param("locale", locale).query(this::row).list();
    }
    public Optional<EditorialItem> published(EditorialKind kind, String locale, String slug) {
        return jdbc.sql("select * from editorial.item where kind=:kind and locale=:locale and live->>'slug'=:slug and live is not null")
                .param("kind", kind.name()).param("locale", locale).param("slug", slug).query(this::row).optional();
    }
    public boolean slugTaken(EditorialKind kind, String locale, String slug, UUID except) {
        return jdbc.sql("select count(*) from editorial.item where kind=:kind and locale=:locale and (slug=:slug or live->>'slug'=:slug) and id<>:except")
                .param("kind", kind.name()).param("locale", locale).param("slug", slug).param("except", except)
                .query(Long.class).single() > 0;
    }
    public boolean articleTaken(UUID articleId, UUID except) {
        return jdbc.sql("select count(*) from editorial.item where (article_id=:article or live->>'articleId'=:articleText) and id<>:except")
                .param("article", articleId).param("articleText", articleId.toString())
                .param("except", except).query(Long.class).single() > 0;
    }
    public void insert(EditorialItem item) {
        jdbc.sql("""
                insert into editorial.item(id,kind,locale,slug,draft,version,draft_version,created_at,updated_at)
                values(:id,:kind,:locale,:slug,cast(:draft as jsonb),:version,:draftVersion,:created,:updated)
                """).param("id", item.id()).param("kind", item.kind().name()).param("locale", item.locale())
                .param("slug", item.draft().slug()).param("draft", json.writeValueAsString(item.draft()))
                .param("version", item.version()).param("draftVersion", item.draftVersion())
                .param("created", item.createdAt().atOffset(ZoneOffset.UTC))
                .param("updated", item.updatedAt().atOffset(ZoneOffset.UTC)).update();
    }
    public void save(EditorialItem item, long expectedVersion) {
        var changed = jdbc.sql("""
                update editorial.item set slug=:slug,article_id=:article,draft=cast(:draft as jsonb),live=cast(:live as jsonb),
                  version=:version,draft_version=:draftVersion,published_draft_version=:publishedVersion,
                  updated_at=:updated,published_at=:published where id=:id and version=:expected
                """).param("id", item.id()).param("expected", expectedVersion)
                .param("slug", item.draft().slug()).param("article", item.draft().articleId(), Types.OTHER)
                .param("draft", json.writeValueAsString(item.draft()))
                .param("live", item.live() == null ? null : json.writeValueAsString(item.live()), Types.VARCHAR)
                .param("version", item.version()).param("draftVersion", item.draftVersion())
                .param("publishedVersion", item.publishedDraftVersion(), Types.BIGINT)
                .param("updated", item.updatedAt().atOffset(ZoneOffset.UTC))
                .param("published", item.publishedAt() == null ? null : item.publishedAt().atOffset(ZoneOffset.UTC), Types.TIMESTAMP_WITH_TIMEZONE)
                .update();
        if (changed != 1) throw new DomainException("STALE_VERSION", "Hồ sơ đã được sửa ở nơi khác.");
    }
}
