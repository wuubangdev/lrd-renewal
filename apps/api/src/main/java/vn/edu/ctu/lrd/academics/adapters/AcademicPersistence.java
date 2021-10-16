package vn.edu.ctu.lrd.academics.adapters;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import vn.edu.ctu.lrd.academics.application.port.AcademicRepository;
import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.academics.domain.AcademicProgram.ProgramEdition;
import vn.edu.ctu.lrd.academics.domain.AdmissionCampaign.AdmissionEdition;

import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class AcademicPersistence implements AcademicRepository {
    private final JdbcClient jdbc;
    private final AcademicJson json;

    public AcademicPersistence(JdbcClient jdbc, AcademicJson json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public void lockChanges() {
        jdbc.sql("select pg_advisory_xact_lock(71234803)").query((r, n) -> 0).single();
    }

    public Optional<AcademicProgram> program(UUID id) {
        return jdbc.sql("select * from academics.program where id=:id")
                .param("id", id)
                .query(this::mapProgram)
                .optional();
    }

    public Optional<AdmissionCampaign> admission(UUID id) {
        return jdbc.sql("select * from academics.admission where id=:id")
                .param("id", id)
                .query(this::mapAdmission)
                .optional();
    }

    public void insert(AcademicProgram p) {
        insert("program", p.id(), p.code(), p.locale(), p.level(), p.draft(), p.createdAt());
    }

    public void insert(AdmissionCampaign p) {
        insert("admission", p.id(), p.code(), p.locale(), p.level(), p.draft(), p.createdAt());
    }

    private void insert(
            String table,
            UUID id,
            String code,
            String locale,
            EducationLevel level,
            Object draft,
            Instant at) {
        jdbc.sql(
                        "insert into academics."
                                + table
                                + "(id,code,locale,level,draft,draft_version,version,created_at,updated_at)"
                                + " values(:id,:code,:locale,:level,cast(:draft as"
                                + " jsonb),1,0,:at,:at)")
                .param("id", id)
                .param("code", code)
                .param("locale", locale)
                .param("level", level.name())
                .param("draft", json.encode(draft))
                .param("at", stamp(at))
                .update();
    }

    public void save(AcademicProgram p, long expected) {
        if (p.live() != null) {
            var e = p.live();
            jdbc.sql(
                            "insert into"
                                + " academics.program_edition(id,program_id,draft_version,snapshot,published_at,published_by)"
                                + " values(:id,:parent,:dv,cast(:snapshot as jsonb),:at,:actor) on"
                                + " conflict(id) do nothing")
                    .param("id", e.id())
                    .param("parent", p.id())
                    .param("dv", e.draftVersion())
                    .param("snapshot", json.encode(e.snapshot()))
                    .param("at", stamp(e.publishedAt()))
                    .param("actor", e.publishedBy())
                    .update();
        }
        int changed =
                jdbc.sql(
                                "update academics.program set draft=cast(:draft as"
                                    + " jsonb),draft_version=:dv,version=:v,live_edition_id=:live,retired=:retired,retirement_reason=:reason,updated_at=:at"
                                    + " where id=:id and version=:expected")
                        .param("id", p.id())
                        .param("draft", json.encode(p.draft()))
                        .param("dv", p.draftVersion())
                        .param("v", p.version())
                        .param("live", p.live() == null ? null : p.live().id())
                        .param("retired", p.retired())
                        .param("reason", p.retirementReason())
                        .param("at", stamp(p.updatedAt()))
                        .param("expected", expected)
                        .update();
        require(changed == 1, "STALE_VERSION", "Chương trình đã thay đổi. Hãy tải lại.");
    }

    public void save(AdmissionCampaign p, long expected) {
        if (p.live() != null) {
            var e = p.live();
            jdbc.sql(
                            """
                            insert into academics.admission_edition(id,admission_id,draft_version,snapshot,programs,closed_at,closure_reason,action,reason,published_at,published_by)
                            values(:id,:parent,:dv,cast(:snapshot as jsonb),cast(:programs as jsonb),:closed,:closure,:action,:reason,:at,:actor) on conflict(id) do nothing
                            """)
                    .param("id", e.id())
                    .param("parent", p.id())
                    .param("dv", e.draftVersion())
                    .param("snapshot", json.encode(e.snapshot()))
                    .param("programs", json.encode(e.programs()))
                    .param("closed", stamp(e.closedAt()))
                    .param("closure", e.closureReason())
                    .param("action", e.action())
                    .param("reason", e.reason())
                    .param("at", stamp(e.publishedAt()))
                    .param("actor", e.publishedBy())
                    .update();
        }
        int changed =
                jdbc.sql(
                                "update academics.admission set draft=cast(:draft as"
                                    + " jsonb),draft_version=:dv,version=:v,live_edition_id=:live,updated_at=:at"
                                    + " where id=:id and version=:expected")
                        .param("id", p.id())
                        .param("draft", json.encode(p.draft()))
                        .param("dv", p.draftVersion())
                        .param("v", p.version())
                        .param("live", p.live() == null ? null : p.live().id())
                        .param("at", stamp(p.updatedAt()))
                        .param("expected", expected)
                        .update();
        require(changed == 1, "STALE_VERSION", "Đợt tuyển đã thay đổi. Hãy tải lại.");
        jdbc.sql("delete from academics.admission_program where admission_id=:id")
                .param("id", p.id())
                .update();
        if (p.live() != null)
            for (var choice : p.live().snapshot().programs())
                jdbc.sql(
                                "insert into academics.admission_program(admission_id,program_id)"
                                        + " values(:id,:program)")
                        .param("id", p.id())
                        .param("program", choice.programId())
                        .update();
    }

    private String filter() {
        return " where (:locale='' or locale=:locale) and (code ilike :q escape '!' or"
                + " draft->>'title' ilike :q escape '!')";
    }

    private String term(String q) {
        return "%" + q.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
    }

    private JdbcClient.StatementSpec list(
            String table, String query, String locale, int page, int size) {
        return jdbc.sql(
                        "select * from academics."
                                + table
                                + filter()
                                + " order by updated_at desc,id limit :size offset :offset")
                .param("locale", locale)
                .param("q", term(query))
                .param("size", size)
                .param("offset", (long) page * size);
    }

    public List<AcademicProgram> programs(String q, String locale, int page, int size) {
        return list("program", q, locale, page, size).query(this::mapProgram).list();
    }

    public List<AdmissionCampaign> admissions(String q, String locale, int page, int size) {
        return list("admission", q, locale, page, size).query(this::mapAdmission).list();
    }

    public long count(String kind, String q, String locale) {
        require(
                Set.of("program", "admission").contains(kind),
                "INVALID_QUERY",
                "Loại không hợp lệ.");
        return jdbc.sql("select count(*) from academics." + kind + filter())
                .param("locale", locale)
                .param("q", term(q))
                .query(Long.class)
                .single();
    }

    public List<ProgramEdition> programHistory(UUID id) {
        return jdbc.sql(
                        "select * from academics.program_edition where program_id=:id order by"
                                + " published_at desc,id desc limit 50")
                .param("id", id)
                .query(this::mapProgramEdition)
                .list();
    }

    public List<AdmissionEdition> admissionHistory(UUID id) {
        return jdbc.sql(
                        "select * from academics.admission_edition where admission_id=:id order by"
                                + " published_at desc,id desc limit 50")
                .param("id", id)
                .query(this::mapAdmissionEdition)
                .list();
    }

    public Optional<ProgramEdition> programEdition(UUID id, UUID edition) {
        return jdbc.sql(
                        "select * from academics.program_edition where program_id=:id and"
                                + " id=:edition")
                .param("id", id)
                .param("edition", edition)
                .query(this::mapProgramEdition)
                .optional();
    }

    public Optional<AdmissionEdition> admissionEdition(UUID id, UUID edition) {
        return jdbc.sql(
                        "select * from academics.admission_edition where admission_id=:id and"
                                + " id=:edition")
                .param("id", id)
                .param("edition", edition)
                .query(this::mapAdmissionEdition)
                .optional();
    }

    public boolean hasActiveAdmissions(UUID id, Instant now) {
        return jdbc.sql(
                        """
                        select exists(select 1 from academics.admission_program link join academics.admission a on a.id=link.admission_id
                        join academics.admission_edition e on e.id=a.live_edition_id
                        where link.program_id=:id and e.closed_at is null and ((e.snapshot->>'closesAt') is null or (e.snapshot->>'closesAt')::timestamptz>:now))
                        """)
                .param("id", id)
                .param("now", stamp(now))
                .query(Boolean.class)
                .single();
    }

    private AcademicProgram mapProgram(ResultSet r, int n) throws SQLException {
        UUID id = r.getObject("id", UUID.class), live = r.getObject("live_edition_id", UUID.class);
        return new AcademicProgram(
                id,
                r.getString("code"),
                r.getString("locale"),
                EducationLevel.valueOf(r.getString("level")),
                json.decode(r.getString("draft"), ProgramDraft.class),
                r.getLong("draft_version"),
                r.getLong("version"),
                live == null ? null : programEdition(id, live).orElseThrow(),
                r.getBoolean("retired"),
                r.getString("retirement_reason"),
                instant(r, "created_at"),
                instant(r, "updated_at"));
    }

    private AdmissionCampaign mapAdmission(ResultSet r, int n) throws SQLException {
        UUID id = r.getObject("id", UUID.class), live = r.getObject("live_edition_id", UUID.class);
        return new AdmissionCampaign(
                id,
                r.getString("code"),
                r.getString("locale"),
                EducationLevel.valueOf(r.getString("level")),
                json.decode(r.getString("draft"), AdmissionDraft.class),
                r.getLong("draft_version"),
                r.getLong("version"),
                live == null ? null : admissionEdition(id, live).orElseThrow(),
                instant(r, "created_at"),
                instant(r, "updated_at"));
    }

    private ProgramEdition mapProgramEdition(ResultSet r, int n) throws SQLException {
        return new ProgramEdition(
                r.getObject("id", UUID.class),
                r.getObject("program_id", UUID.class),
                r.getLong("draft_version"),
                json.decode(r.getString("snapshot"), ProgramDraft.class),
                instant(r, "published_at"),
                r.getObject("published_by", UUID.class));
    }

    private AdmissionEdition mapAdmissionEdition(ResultSet r, int n) throws SQLException {
        return new AdmissionEdition(
                r.getObject("id", UUID.class),
                r.getObject("admission_id", UUID.class),
                (Long) r.getObject("draft_version"),
                json.decode(r.getString("snapshot"), AdmissionDraft.class),
                List.of(
                        json.decode(
                                r.getString("programs"),
                                AdmissionCampaign.ProgramSnapshot[].class)),
                instant(r, "closed_at"),
                r.getString("closure_reason"),
                r.getString("action"),
                r.getString("reason"),
                instant(r, "published_at"),
                r.getObject("published_by", UUID.class));
    }

    private static Timestamp stamp(Instant i) {
        return i == null ? null : Timestamp.from(i);
    }

    private static Instant instant(ResultSet r, String field) throws SQLException {
        var t = r.getTimestamp(field);
        return t == null ? null : t.toInstant();
    }
}
