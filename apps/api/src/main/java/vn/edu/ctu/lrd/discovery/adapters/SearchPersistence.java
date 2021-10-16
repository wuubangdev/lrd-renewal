package vn.edu.ctu.lrd.discovery.adapters;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.discovery.api.SearchCatalog;

import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

@Repository
public class SearchPersistence implements SearchCatalog {
    private final JdbcClient jdbc;

    public SearchPersistence(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void index(Document d) {
        jdbc.sql(
                        "insert into"
                            + " discovery.search_document(source_id,locale,slug,title,summary,category,cover_id,author_name,search_text,published_at,source_published_on)"
                            + " values(:id,:locale,:slug,:title,:summary,:category,:cover,:author,:text,:at,:sourceDate)"
                            + " on conflict(source_id) do update set"
                            + " slug=excluded.slug,title=excluded.title,summary=excluded.summary,category=excluded.category,cover_id=excluded.cover_id,author_name=excluded.author_name,search_text=excluded.search_text,published_at=excluded.published_at,source_published_on=excluded.source_published_on")
                .param("id", d.id())
                .param("locale", d.locale())
                .param("slug", d.slug())
                .param("title", d.title())
                .param("summary", d.summary())
                .param("category", d.category())
                .param("cover", d.coverId())
                .param("author", d.authorName())
                .param("text", normalize(d.title() + " " + d.summary() + " " + d.text()))
                .param("at", java.sql.Timestamp.from(d.publishedAt()))
                .param("sourceDate", d.sourcePublishedOn(), java.sql.Types.DATE)
                .update();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void remove(UUID id) {
        jdbc.sql("delete from discovery.search_document where source_id=:id")
                .param("id", id)
                .update();
    }

    public Result search(String locale, String query, String category, int page, int size) {
        require(
                page >= 0 && size >= 1 && size <= 50 && query.length() <= 200,
                "INVALID_QUERY",
                "Tìm kiếm không hợp lệ.");
        String filter =
                " where locale=:locale and search_text like :query escape '!'"
                        + (category.isBlank() ? "" : " and category=:category");
        String term =
                "%"
                        + normalize(query).replace("!", "!!").replace("%", "!%").replace("_", "!_")
                        + "%";
        var count =
                jdbc.sql("select count(*) from discovery.search_document" + filter)
                        .param("locale", locale)
                        .param("query", term);
        var list =
                jdbc.sql(
                                "select * from discovery.search_document"
                                        + filter
                                        + " order by coalesce(source_published_on,(published_at at"
                                        + " time zone 'Asia/Ho_Chi_Minh')::date) desc,published_at"
                                        + " desc,source_id limit :size offset :offset")
                        .param("locale", locale)
                        .param("query", term)
                        .param("size", size)
                        .param("offset", page * size);
        if (!category.isBlank()) {
            count.param("category", category);
            list.param("category", category);
        }
        var items =
                list.query(
                                (r, n) ->
                                        new Document(
                                                r.getObject("source_id", UUID.class),
                                                r.getString("locale"),
                                                r.getString("slug"),
                                                r.getString("title"),
                                                r.getString("summary"),
                                                r.getString("category"),
                                                r.getObject("cover_id", UUID.class),
                                                r.getString("author_name"),
                                                "",
                                                r.getTimestamp("published_at").toInstant(),
                                                r.getObject(
                                                        "source_published_on",
                                                        java.time.LocalDate.class)))
                        .list();
        return new Result(items, count.query(Long.class).single(), page, size);
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
    }

    public java.util.List<Document> findPublished(String locale, java.util.Set<UUID> ids) {
        if (ids.isEmpty()) return java.util.List.of();
        return jdbc.sql(
                        "select * from discovery.search_document where locale=:locale and source_id"
                                + " in (:ids)")
                .param("locale", locale)
                .param("ids", ids)
                .query(
                        (r, n) ->
                                new Document(
                                        r.getObject("source_id", UUID.class),
                                        r.getString("locale"),
                                        r.getString("slug"),
                                        r.getString("title"),
                                        r.getString("summary"),
                                        r.getString("category"),
                                        r.getObject("cover_id", UUID.class),
                                        r.getString("author_name"),
                                        "",
                                        r.getTimestamp("published_at").toInstant(),
                                        r.getObject(
                                                "source_published_on", java.time.LocalDate.class)))
                .list();
    }
}
