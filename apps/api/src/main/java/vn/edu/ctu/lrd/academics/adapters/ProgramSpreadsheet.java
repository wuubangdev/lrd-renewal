package vn.edu.ctu.lrd.academics.adapters;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import static vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable;
import vn.edu.ctu.lrd.sharedkernel.*;

@RestController
@RequestMapping("/api/v1/admin/academics/programs/spreadsheet")
public class ProgramSpreadsheet {
    private static final Spec[] SPECS = {
        new Spec("Programs", "key", "code", "locale", "level", "title", "slug", "summary", "description", "degree", "unit", "durationMonths", "credits", "contactName", "contactEmail", "contactPhone", "coverId", "coverAlt", "sourceUrl", "sourcePublishedOn", "sourceRetrievedOn"),
        new Spec("Outcomes", "key", "outcome"),
        new Spec("Careers", "key", "career"),
        new Spec("Curricula", "key", "curriculumKey", "name", "cohort", "current", "effectiveFrom", "effectiveTo", "documentUrl"),
        new Spec("Courses", "key", "curriculumKey", "code", "name", "credits", "semester", "elective"),
        new Spec("Accreditations", "key", "name", "organization", "issuedAt", "expiresAt", "evidenceUrl"),
        new Spec("Resources", "key", "label", "url")
    };
    private final AcademicFacade academics;
    private final ActorResolver actors;
    public ProgramSpreadsheet(AcademicFacade academics, ActorResolver actors) { this.academics = academics; this.actors = actors; }

    @GetMapping("/template")
    ResponseEntity<byte[]> template() {
        actors.current().require("academics:manage");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=program-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(WorkbookTable.template("Mẫu chương trình: level UNDERGRADUATE/MASTER/DOCTORATE; degree BACHELOR/ENGINEER/MASTER/DOCTOR. Cột key liên kết các sheet; curriculumKey liên kết học phần.", SPECS));
    }

    private record ImportRow(String code, String locale, EducationLevel level, ProgramDraft draft) {}

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    Map<String, Object> importFile(@RequestPart MultipartFile file) throws java.io.IOException {
        Actor actor = actors.current(); actor.require("academics:manage");
        require(file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"),
                "INVALID_SPREADSHEET", "Chỉ hỗ trợ file .xlsx.");
        var sheets = read(file.getBytes(), SPECS);
        var programs = sheets.get("Programs");
        require(!programs.isEmpty() && programs.size() <= 500, "INVALID_SPREADSHEET", "Cần 1–500 chương trình trong sheet Programs.");
        var outcomes = children(programs, sheets.get("Outcomes"));
        var careers = children(programs, sheets.get("Careers"));
        var curricula = children(programs, sheets.get("Curricula"));
        var courses = children(programs, sheets.get("Courses"));
        var accreditations = children(programs, sheets.get("Accreditations"));
        var resources = children(programs, sheets.get("Resources"));
        var parsed = new ArrayList<ImportRow>();
        var codes = new HashSet<String>();
        var slugs = new HashSet<String>();
        for (var program : programs) {
            var key = program.get("key");
            var level = choice(program.required("level"), EducationLevel.class, program, "level");
            var locale = program.required("locale");
            var code = AcademicRules.code(program.required("code"));
            AcademicRules.locale(locale);
            require(codes.add(locale + ":" + code), "INVALID_SPREADSHEET", "Mã chương trình bị trùng trong file: " + code);
            var curriculumRows = new LinkedHashMap<String, Entry>();
            for (var row : curricula.get(key))
                require(curriculumRows.putIfAbsent(row.required("curriculumKey"), row) == null,
                        "INVALID_SPREADSHEET", "Dòng " + row.line() + ": curriculumKey bị trùng.");
            var coursesByCurriculum = new LinkedHashMap<String, List<CurriculumVersion.Course>>();
            for (var curriculumKey : curriculumRows.keySet()) coursesByCurriculum.put(curriculumKey, new ArrayList<>());
            for (var row : courses.get(key)) {
                var curriculumKey = row.required("curriculumKey");
                require(coursesByCurriculum.containsKey(curriculumKey), "INVALID_SPREADSHEET", "Dòng " + row.line() + ": curriculumKey chưa có.");
                BigDecimal credits;
                try { credits = new BigDecimal(row.required("credits")); }
                catch (NumberFormatException ex) { throw new DomainException("INVALID_SPREADSHEET", "Dòng " + row.line() + ": credits không phải số."); }
                coursesByCurriculum.get(curriculumKey).add(new CurriculumVersion.Course(UUID.randomUUID(),
                        row.required("code"), row.required("name"), credits,
                        integer(row.required("semester"), row, "semester"), bool(row.get("elective"), row, "elective")));
            }
            var curriculumValues = new ArrayList<CurriculumVersion>();
            for (var item : curriculumRows.entrySet()) {
                var row = item.getValue();
                curriculumValues.add(new CurriculumVersion(UUID.randomUUID(), row.get("name"), row.get("cohort"),
                        bool(row.get("current"), row, "current"), date(row.get("effectiveFrom"), row, "effectiveFrom"),
                        date(row.get("effectiveTo"), row, "effectiveTo"), row.get("documentUrl"), coursesByCurriculum.get(item.getKey())));
            }
            SourceReference source = null;
            if (!program.get("sourceUrl").isBlank()) source = new SourceReference(program.get("sourceUrl"),
                    date(program.get("sourcePublishedOn"), program, "sourcePublishedOn"),
                    date(program.get("sourceRetrievedOn"), program, "sourceRetrievedOn"));
            var draft = new ProgramDraft(program.required("title"), program.required("slug"), program.get("summary"),
                    program.get("description"), choice(program.required("degree"), ProgramDraft.Degree.class, program, "degree"),
                    program.get("unit"), integer(program.get("durationMonths"), program, "durationMonths"),
                    integer(program.get("credits"), program, "credits"),
                    outcomes.get(key).stream().map(row -> row.required("outcome")).toList(),
                    careers.get(key).stream().map(row -> row.required("career")).toList(),
                    new PublicContact(program.get("contactName"), program.get("contactEmail"), program.get("contactPhone")),
                    uuid(program.get("coverId"), program, "coverId"), program.get("coverAlt"), curriculumValues,
                    accreditations.get(key).stream().map(row -> new Accreditation(UUID.randomUUID(), row.get("name"),
                            row.get("organization"), date(row.get("issuedAt"), row, "issuedAt"),
                            date(row.get("expiresAt"), row, "expiresAt"), row.get("evidenceUrl"))).toList(),
                    resources.get(key).stream().map(row -> new AcademicResource(row.required("label"), row.required("url"))).toList(), source);
            require(slugs.add(locale + ":" + draft.slug()), "INVALID_SPREADSHEET", "Đường dẫn chương trình bị trùng trong file: " + draft.slug());
            parsed.add(new ImportRow(code, locale, level, draft));
        }
        var ids = new ArrayList<UUID>();
        for (var row : parsed) {
            var created = academics.create(actor, "programs", row.code(), row.locale(), row.level());
            ids.add(academics.reviseProgram(actor, created.id(), row.draft(), created.version()).id());
        }
        return Map.of("created", ids.size(), "ids", ids);
    }
}
