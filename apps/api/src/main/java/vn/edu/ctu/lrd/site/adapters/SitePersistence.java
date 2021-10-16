package vn.edu.ctu.lrd.site.adapters;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import vn.edu.ctu.lrd.sharedkernel.DomainException;
import vn.edu.ctu.lrd.site.application.port.SiteRepository;
import vn.edu.ctu.lrd.site.domain.*;

import java.sql.*;
import java.util.*;

@Repository
public class SitePersistence implements SiteRepository {
    private final JdbcClient jdbc;
    private final ObjectMapper json;

    public SitePersistence(JdbcClient jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public SiteContent decode(String source, SiteDocument.Kind kind) {
        return kind == SiteDocument.Kind.HOME
                ? json.readValue(source, HomeComposition.class)
                : json.readValue(source, NavigationMenu.class);
    }

    public Optional<SiteDocument> find(SiteDocument.Kind kind, String locale) {
        return jdbc.sql("select * from site.managed_document where kind=:kind and locale=:locale")
                .param("kind", kind.name())
                .param("locale", locale)
                .query(
                        (r, n) -> {
                            UUID id = r.getObject("id", UUID.class),
                                    liveId = r.getObject("live_release_id", UUID.class);
                            var live = liveId == null ? null : release(id, liveId).orElseThrow();
                            return new SiteDocument(
                                    id,
                                    kind,
                                    locale,
                                    decode(r.getString("draft"), kind),
                                    r.getLong("draft_version"),
                                    r.getLong("version"),
                                    live,
                                    r.getTimestamp("updated_at").toInstant());
                        })
                .optional();
    }

    public void save(SiteDocument d, long expected) {
        if (d.live() != null) {
            var live = d.live();
            jdbc.sql(
                            "insert into"
                                + " site.document_release(id,document_id,draft_version,snapshot,published_at,published_by)"
                                + " values(:id,:doc,:draft,cast(:snapshot as jsonb),:at,:actor) on"
                                + " conflict(id) do nothing")
                    .param("id", live.id())
                    .param("doc", d.id())
                    .param("draft", live.draftVersion())
                    .param("snapshot", json.writeValueAsString(live.snapshot()))
                    .param("at", Timestamp.from(live.publishedAt()))
                    .param("actor", live.publishedBy())
                    .update();
        }
        int changed =
                jdbc.sql(
                                "update site.managed_document set draft=cast(:draft as"
                                    + " jsonb),draft_version=:dv,version=:version,live_release_id=:live,updated_at=:at"
                                    + " where id=:id and version=:expected")
                        .param("draft", json.writeValueAsString(d.draft()))
                        .param("dv", d.draftVersion())
                        .param("version", d.version())
                        .param("live", d.live() == null ? null : d.live().id())
                        .param("at", Timestamp.from(d.updatedAt()))
                        .param("id", d.id())
                        .param("expected", expected)
                        .update();
        DomainException.require(
                changed == 1,
                "STALE_VERSION",
                "Trang đã thay đổi. Hãy tải lại trước khi tiếp tục.");
    }

    public void initialize(SiteDocument d) {
        jdbc.sql("select pg_advisory_xact_lock(71234802)").query((r, n) -> 0).single();
        if (find(d.kind(), d.locale()).isPresent()) return;
        jdbc.sql(
                        "insert into"
                            + " site.managed_document(id,kind,locale,draft,draft_version,version,updated_at)"
                            + " values(:id,:kind,:locale,cast(:draft as jsonb),:dv,:version,:at)")
                .param("id", d.id())
                .param("kind", d.kind().name())
                .param("locale", d.locale())
                .param("draft", json.writeValueAsString(d.draft()))
                .param("dv", d.draftVersion())
                .param("version", d.version())
                .param("at", Timestamp.from(d.updatedAt()))
                .update();
        if (d.live() != null) save(d, d.version());
    }

    public List<SiteDocument.Release> history(UUID documentId) {
        return jdbc.sql(
                        "select r.*,d.kind from site.document_release r join site.managed_document"
                                + " d on d.id=r.document_id where document_id=:doc order by"
                                + " published_at desc,id desc limit 50")
                .param("doc", documentId)
                .query(this::mapRelease)
                .list();
    }

    public Optional<SiteDocument.Release> release(UUID documentId, UUID releaseId) {
        return jdbc.sql(
                        "select r.*,d.kind from site.document_release r join site.managed_document"
                                + " d on d.id=r.document_id where document_id=:doc and r.id=:id")
                .param("doc", documentId)
                .param("id", releaseId)
                .query(this::mapRelease)
                .optional();
    }

    private SiteDocument.Release mapRelease(ResultSet r, int n) throws SQLException {
        return new SiteDocument.Release(
                r.getObject("id", UUID.class),
                r.getObject("document_id", UUID.class),
                r.getLong("draft_version"),
                decode(r.getString("snapshot"), SiteDocument.Kind.valueOf(r.getString("kind"))),
                r.getTimestamp("published_at").toInstant(),
                r.getObject("published_by", UUID.class));
    }
}
