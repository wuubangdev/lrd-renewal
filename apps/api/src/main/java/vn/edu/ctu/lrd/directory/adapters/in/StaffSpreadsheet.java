package vn.edu.ctu.lrd.directory.adapters.in;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import static vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable.*;

import java.util.*;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.ctu.lrd.directory.application.StaffService;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable;
import vn.edu.ctu.lrd.sharedkernel.*;

@RestController
@RequestMapping("/api/v1/admin/people/spreadsheet")
public class StaffSpreadsheet {
    private static final Spec[] SPECS = {
        new Spec("People", "key", "name", "slug", "academicTitle", "degree", "highestDegreeYear", "academicRank", "academicRankYear", "birthDate", "birthPlace", "position", "unit", "email", "phone", "office", "website", "summary", "researchInterests", "portraitId", "portraitAlt", "template", "sourceArticleId", "privateNotes"),
        new Spec("Specialties", "key", "specialty"),
        new Spec("Undergraduate", "key", "degree", "period", "institution", "major", "graduationYear", "thesis", "mode"),
        new Spec("Postgraduate", "key", "degree", "period", "institution", "major", "graduationYear", "thesis", "mode"),
        new Spec("WorkHistory", "key", "period", "institution", "role", "description"),
        new Spec("ResearchProjects", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("Publications", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("Books", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("Supervisions", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("TrainingCourses", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("Awards", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("Memberships", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("OtherActivities", "key", "title", "period", "organization", "role", "description", "url"),
        new Spec("Languages", "key", "language", "proficiency", "certificate"),
        new Spec("PrivateFacts", "key", "label", "value")
    };
    private final StaffService service;
    private final ActorResolver actors;
    public StaffSpreadsheet(StaffService service, ActorResolver actors) { this.service = service; this.actors = actors; }

    @GetMapping("/template")
    ResponseEntity<byte[]> template() {
        actors.current().require("directory:manage");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=staff-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(WorkbookTable.template("Mẫu nhập cán bộ", SPECS));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    Map<String, Object> importFile(@RequestParam String locale, @RequestPart MultipartFile file) throws java.io.IOException {
        Actor actor = actors.current(); actor.require("directory:manage");
        require(Set.of("vi", "en").contains(locale), "INVALID_LOCALE", "Ngôn ngữ không hợp lệ.");
        require(file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"),
                "INVALID_SPREADSHEET", "Chỉ hỗ trợ file .xlsx.");
        var sheets = read(file.getBytes(), SPECS);
        var people = sheets.get("People");
        require(!people.isEmpty() && people.size() <= 500, "INVALID_SPREADSHEET", "Cần 1–500 cán bộ trong sheet People.");
        var specialties = children(people, sheets.get("Specialties"));
        var undergraduate = children(people, sheets.get("Undergraduate"));
        var postgraduate = children(people, sheets.get("Postgraduate"));
        var workHistory = children(people, sheets.get("WorkHistory"));
        var research = children(people, sheets.get("ResearchProjects"));
        var publications = children(people, sheets.get("Publications"));
        var books = children(people, sheets.get("Books"));
        var supervisions = children(people, sheets.get("Supervisions"));
        var training = children(people, sheets.get("TrainingCourses"));
        var awards = children(people, sheets.get("Awards"));
        var memberships = children(people, sheets.get("Memberships"));
        var other = children(people, sheets.get("OtherActivities"));
        var languages = children(people, sheets.get("Languages"));
        var facts = children(people, sheets.get("PrivateFacts"));
        var parsed = new ArrayList<StaffDetails>();
        var slugs = new HashSet<String>();
        for (var person : people) {
            var key = person.required("key");
            var academic = new StaffAcademicInfo(person.get("highestDegreeYear"), person.get("academicRank"),
                    person.get("academicRankYear"), person.get("birthDate"), person.get("birthPlace"),
                    person.get("researchInterests"), education(undergraduate.get(key)), education(postgraduate.get(key)),
                    workHistory.get(key).stream().map(row -> new StaffCareer(row.get("period"), row.get("institution"), row.get("role"), row.get("description"))).toList(),
                    activities(research.get(key)), activities(publications.get(key)), activities(books.get(key)),
                    activities(supervisions.get(key)), activities(training.get(key)), activities(awards.get(key)),
                    activities(memberships.get(key)), activities(other.get(key)),
                    languages.get(key).stream().map(row -> new StaffLanguage(row.required("language"), row.get("proficiency"), row.get("certificate"))).toList());
            var detail = new StaffDetails(person.required("name"), person.required("slug"), person.get("academicTitle"),
                    person.get("degree"), person.get("position"), person.get("unit"), person.get("email"), person.get("phone"),
                    person.get("office"), person.get("website"), person.get("summary"),
                    specialties.get(key).stream().map(row -> row.required("specialty")).toList(),
                    uuid(person.get("portraitId"), person, "portraitId"), person.get("portraitAlt"),
                    person.get("template").isBlank() ? "EDITORIAL" : person.get("template"), List.of(),
                    uuid(person.get("sourceArticleId"), person, "sourceArticleId"),
                    facts.get(key).stream().map(row -> new StaffFact(row.required("label"), row.get("value"))).toList(),
                    person.get("privateNotes"), academic);
            require(slugs.add(detail.slug()), "INVALID_SPREADSHEET", "Đường dẫn cán bộ bị trùng trong file: " + detail.slug());
            parsed.add(detail);
        }
        var ids = new ArrayList<UUID>();
        for (var detail : parsed) {
            var created = service.create(actor, locale);
            ids.add(service.save(actor, created.id(), created.version(), detail).id());
        }
        return Map.of("created", ids.size(), "ids", ids);
    }

    private static List<StaffEducation> education(List<Entry> rows) {
        return rows.stream().map(row -> new StaffEducation(row.get("degree"), row.get("period"),
                row.get("institution"), row.get("major"), row.get("graduationYear"),
                row.get("thesis"), row.get("mode"))).toList();
    }
    private static List<StaffActivity> activities(List<Entry> rows) {
        return rows.stream().map(row -> new StaffActivity(row.required("title"), row.get("period"),
                row.get("organization"), row.get("role"), row.get("description"), row.get("url"))).toList();
    }
}
