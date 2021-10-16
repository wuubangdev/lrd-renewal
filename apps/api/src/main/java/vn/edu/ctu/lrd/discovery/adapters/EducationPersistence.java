package vn.edu.ctu.lrd.discovery.adapters;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.*;

import tools.jackson.databind.ObjectMapper;

import vn.edu.ctu.lrd.discovery.api.EducationCatalog;

import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class EducationPersistence implements EducationCatalog {
    private final JdbcClient jdbc;
    private final ObjectMapper json;

    public EducationPersistence(JdbcClient jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void index(Document d) {
        jdbc.sql(
                        """
                        insert into discovery.education_document(source_id,kind,code,locale,level,slug,title,summary,cover_id,year,opens_at,closes_at,closed_at,program_ids,search_text,published_at)
                        values(:id,:kind,:code,:locale,:level,:slug,:title,:summary,:cover,:year,:opens,:closes,:closed,cast(:programs as jsonb),:text,:at)
                        on conflict(source_id) do update set slug=excluded.slug,title=excluded.title,summary=excluded.summary,cover_id=excluded.cover_id,
                        year=excluded.year,opens_at=excluded.opens_at,closes_at=excluded.closes_at,closed_at=excluded.closed_at,
                        program_ids=excluded.program_ids,search_text=excluded.search_text,published_at=excluded.published_at
                        """)
                .param("id", d.id())
                .param("kind", d.kind())
                .param("code", d.code())
                .param("locale", d.locale())
                .param("level", d.level())
                .param("slug", d.slug())
                .param("title", d.title())
                .param("summary", d.summary())
                .param("cover", d.coverId())
                .param("year", d.year())
                .param("opens", stamp(d.opensAt()))
                .param("closes", stamp(d.closesAt()))
                .param("closed", stamp(d.closedAt()))
                .param("programs", json.writeValueAsString(d.programIds()))
                .param("text", normalize(d.code() + " " + d.title() + " " + d.summary()))
                .param("at", stamp(d.publishedAt()))
                .update();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void remove(UUID id) {
        jdbc.sql("delete from discovery.education_document where source_id=:id")
                .param("id", id)
                .update();
    }

    public List<Document> findPublished(String locale, String kind, Set<UUID> ids) {
        if (ids.isEmpty()) return List.of();
        return jdbc.sql(
                        "select * from discovery.education_document where locale=:locale and"
                                + " kind=:kind and source_id in (:ids)")
                .param("locale", locale)
                .param("kind", kind)
                .param("ids", ids)
                .query(this::map)
                .list();
    }

    public Result search(
            String locale,
            String kind,
            String query,
            String level,
            String status,
            Integer year,
            UUID program,
            int page,
            int size,
            Instant now) {
        require(
                page >= 0 && page <= 100000 && size >= 1 && size <= 50 && query.length() <= 200,
                "INVALID_QUERY",
                "Bộ lọc không hợp lệ.");
        require(
                Set.of("vi", "en").contains(locale)
                        && Set.of("PROGRAM", "ADMISSION").contains(kind),
                "INVALID_QUERY",
                "Ngôn ngữ hoặc loại không hợp lệ.");
        require(
                level.isEmpty() || Set.of("UNDERGRADUATE", "MASTER", "DOCTORATE").contains(level),
                "INVALID_QUERY",
                "Bậc đào tạo không hợp lệ.");
        require(
                status.isEmpty()
                        || Set.of("NOTICE", "UPCOMING", "OPEN", "CLOSED", "CLOSED_EARLY")
                                .contains(status),
                "INVALID_QUERY",
                "Trạng thái không hợp lệ.");
        String filter = " where locale=:locale and kind=:kind and search_text like :q escape '!'";
        var params = new HashMap<String, Object>();
        params.put("locale", locale);
        params.put("kind", kind);
        params.put(
                "q",
                "%"
                        + normalize(query).replace("!", "!!").replace("%", "!%").replace("_", "!_")
                        + "%");
        if (!level.isEmpty()) {
            filter += " and level=:level";
            params.put("level", level);
        }
        if (year != null) {
            filter += " and year=:year";
            params.put("year", year);
        }
        if (program != null) {
            filter += " and program_ids @> cast(:program as jsonb)";
            params.put("program", json.writeValueAsString(List.of(program)));
        }
        if (!status.isEmpty()) {
            if (!status.equals("CLOSED_EARLY")) params.put("now", stamp(now));
            filter +=
                    switch (status) {
                        case "NOTICE" ->
                                " and kind='ADMISSION' and closed_at is null and (opens_at is null"
                                    + " or closes_at is null) and (closes_at is null or"
                                    + " closes_at>:now)";
                        case "UPCOMING" ->
                                " and closed_at is null and opens_at>:now and closes_at is not"
                                    + " null";
                        case "OPEN" ->
                                " and closed_at is null and opens_at<=:now and closes_at>:now";
                        case "CLOSED" -> " and closed_at is null and closes_at<=:now";
                        default -> " and closed_at is not null";
                    };
        }
        long total =
                jdbc.sql("select count(*) from discovery.education_document" + filter)
                        .params(params)
                        .query(Long.class)
                        .single();
        params.put("size", size);
        params.put("offset", (long) page * size);
        var items =
                jdbc.sql(
                                "select * from discovery.education_document"
                                        + filter
                                        + " order by published_at desc,source_id limit :size offset"
                                        + " :offset")
                        .params(params)
                        .query(this::map)
                        .list();
        return new Result(items, total, page, size, now);
    }

    private Document map(ResultSet r, int n) throws SQLException {
        return new Document(
                r.getObject("source_id", UUID.class),
                r.getString("kind"),
                r.getString("code"),
                r.getString("locale"),
                r.getString("level"),
                r.getString("slug"),
                r.getString("title"),
                r.getString("summary"),
                r.getObject("cover_id", UUID.class),
                (Integer) r.getObject("year"),
                instant(r, "opens_at"),
                instant(r, "closes_at"),
                instant(r, "closed_at"),
                List.of(json.readValue(r.getString("program_ids"), UUID[].class)),
                instant(r, "published_at"));
    }

    private static Instant instant(ResultSet r, String field) throws SQLException {
        var t = r.getTimestamp(field);
        return t == null ? null : t.toInstant();
    }

    private static Timestamp stamp(Instant i) {
        return i == null ? null : Timestamp.from(i);
    }

    private static String normalize(String s) {
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
    }
}
