package vn.edu.ctu.lrd.publishing.adapters.out.persistence;

import jakarta.persistence.EntityManager;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import vn.edu.ctu.lrd.publishing.application.port.ContentRepository;
import vn.edu.ctu.lrd.publishing.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ContentPersistence implements ContentRepository {
    private final EntityManager em;
    private final ObjectMapper json;
    private final JdbcClient jdbc;

    public ContentPersistence(EntityManager em, ObjectMapper json, JdbcClient jdbc) {
        this.em = em;
        this.json = json;
        this.jdbc = jdbc;
    }

    public ContentEntry get(UUID id) {
        var row = em.find(ContentRow.class, id);
        if (row == null) throw new DomainException("NOT_FOUND", "Không tìm thấy bài viết.");
        return domain(row);
    }

    public ContentEntry insert(ContentEntry entry) {
        var row = new ContentRow();
        row.id = entry.id();
        row.ownerId = entry.ownerId();
        row.locale = entry.locale();
        row.createdAt = entry.createdAt();
        update(row, entry);
        em.persist(row);
        em.flush();
        return domain(row);
    }

    public ContentEntry save(ContentEntry entry) {
        var row = em.find(ContentRow.class, entry.id());
        DomainException.require(row != null, "NOT_FOUND", "Không tìm thấy bài viết.");
        DomainException.require(
                row.version == entry.version(),
                "STALE_VERSION",
                "Bài viết đã được cập nhật ở nơi khác.");
        if (entry.live() != null && em.find(RevisionRow.class, entry.live().id()) == null) {
            var p = entry.live();
            var revision = new RevisionRow();
            revision.id = p.id();
            revision.entryId = p.entryId();
            revision.draftVersion = p.draftVersion();
            revision.snapshotJson = json.writeValueAsString(p.snapshot());
            revision.publishedAt = p.publishedAt();
            revision.publishedBy = p.publishedBy();
            revision.authorName = p.authorName();
            em.persist(revision);
        }
        update(row, entry);
        em.flush();
        return domain(row);
    }

    private void update(ContentRow row, ContentEntry entry) {
        row.draftJson = json.writeValueAsString(entry.draft());
        row.draftVersion = entry.draftVersion();
        row.liveRevisionId = entry.live() == null ? null : entry.live().id();
        row.updatedAt = entry.updatedAt();
    }

    private ContentEntry domain(ContentRow row) {
        var live =
                row.liveRevisionId == null
                        ? null
                        : publication(em.find(RevisionRow.class, row.liveRevisionId));
        return new ContentEntry(
                row.id,
                row.ownerId,
                row.locale,
                row.version == null ? 0 : row.version,
                row.draftVersion,
                json.readValue(row.draftJson, ContentDraft.class),
                live,
                row.createdAt,
                row.updatedAt);
    }

    private Publication publication(RevisionRow row) {
        return new Publication(
                row.id,
                row.entryId,
                row.draftVersion,
                json.readValue(row.snapshotJson, ContentDraft.class),
                row.publishedAt,
                row.publishedBy,
                row.authorName);
    }

    private String filterSql(UUID owner) {
        return " from publishing.content_entry c left join publishing.content_revision r on r.id=c.live_revision_id "
                + "where " + (owner == null ? "" : "c.owner_id=:owner and ")
                + "(lower(c.draft_json->>'title') like :q or lower(c.draft_json->>'summary') like :q) "
                + "and (:category='' or c.draft_json->>'category'=:category) "
                + "and (:status='' or (:status='DRAFT' and c.live_revision_id is null) "
                + "or (:status='PUBLISHED' and c.live_revision_id is not null and c.draft_version=r.draft_version) "
                + "or (:status='CHANGED' and c.live_revision_id is not null and c.draft_version>r.draft_version))";
    }

    private JdbcClient.StatementSpec filtered(String select, UUID owner, String query, String category, String status, String suffix) {
        var spec = jdbc.sql(select + filterSql(owner) + suffix)
                .param("q", "%" + query.toLowerCase(java.util.Locale.ROOT) + "%")
                .param("category", category).param("status", status);
        return owner == null ? spec : spec.param("owner", owner);
    }

    public List<ContentEntry> list(UUID owner, int page, int size, String query, String category, String status) {
        return filtered("select c.id", owner, query, category, status,
                " order by c.updated_at desc,c.id limit :size offset :offset")
                .param("size", size).param("offset", page * size)
                .query((rs, n) -> (UUID) rs.getObject("id")).list().stream().map(this::get).toList();
    }

    public long count(UUID owner, String query, String category, String status) {
        return filtered("select count(*)", owner, query, category, status, "").query(Long.class).single();
    }

    public List<Publication> revisions(UUID id) {
        return em
                .createQuery(
                        "select r from RevisionRow r where r.entryId=:id order by r.publishedAt"
                                + " desc",
                        RevisionRow.class)
                .setParameter("id", id)
                .setMaxResults(50)
                .getResultList()
                .stream()
                .map(this::publication)
                .toList();
    }

    public Publication revision(UUID entryId, UUID id) {
        var row = em.find(RevisionRow.class, id);
        DomainException.require(
                row != null && row.entryId.equals(entryId),
                "NOT_FOUND",
                "Không tìm thấy phiên bản.");
        return publication(row);
    }

    public Optional<Publication> retry(UUID actor, String key, UUID entry, long draftVersion) {
        return jdbc.sql(
                        "select entry_id,draft_version,revision_id from"
                                + " publishing.idempotency_record where actor_id=:actor and"
                                + " request_key=:key")
                .param("actor", actor)
                .param("key", key)
                .query(
                        (r, n) -> {
                            DomainException.require(
                                    entry.equals(r.getObject("entry_id", UUID.class))
                                            && draftVersion == r.getLong("draft_version"),
                                    "IDEMPOTENCY_CONFLICT",
                                    "Mã giao dịch đã được dùng cho thao tác khác.");
                            return revision(entry, r.getObject("revision_id", UUID.class));
                        })
                .optional();
    }

    public void remember(UUID actor, String key, Publication p) {
        jdbc.sql(
                        "insert into"
                            + " publishing.idempotency_record(actor_id,request_key,entry_id,draft_version,revision_id,created_at)"
                            + " values(:actor,:key,:entry,:version,:revision,:at)")
                .param("actor", actor)
                .param("key", key)
                .param("entry", p.entryId())
                .param("version", p.draftVersion())
                .param("revision", p.id())
                .param("at", java.sql.Timestamp.from(p.publishedAt()))
                .update();
    }
}
