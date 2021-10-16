package vn.edu.ctu.lrd.directory.adapters.in;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import static vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable.*;

import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.ctu.lrd.directory.application.LaboratoryService;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable;
import vn.edu.ctu.lrd.sharedkernel.*;

@RestController
@RequestMapping("/api/v1/admin/laboratories/spreadsheet")
public class LaboratorySpreadsheet {
    private static final Spec[] SPECS = {
        new Spec("Laboratories", "key", "name", "slug", "shortName", "lead", "location", "email", "phone", "summary", "overview", "functions", "duties", "researchDescription", "additionalNotes", "coverId", "coverAlt", "template", "sourceArticleId"),
        new Spec("ResearchAreas", "key", "area"),
        new Spec("Equipment", "key", "name", "quantity", "description", "imageId", "imageAlt"),
        new Spec("Courses", "key", "name", "code", "level", "description"),
        new Spec("Publications", "key", "citation", "year", "url")
    };
    private final LaboratoryService service;
    private final ActorResolver actors;
    public LaboratorySpreadsheet(LaboratoryService service, ActorResolver actors) { this.service = service; this.actors = actors; }

    @GetMapping("/template")
    ResponseEntity<byte[]> template() {
        actors.current().require("directory:manage");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=laboratory-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(WorkbookTable.template("Mẫu phòng thí nghiệm: Courses.level = UNDERGRADUATE hoặc POSTGRADUATE; key liên kết các sheet.", SPECS));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    Map<String, Object> importFile(@RequestParam String locale, @RequestPart MultipartFile file) throws java.io.IOException {
        Actor actor = actors.current(); actor.require("directory:manage");
        require(Set.of("vi", "en").contains(locale), "INVALID_LOCALE", "Ngôn ngữ không hợp lệ.");
        require(file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"),
                "INVALID_SPREADSHEET", "Chỉ hỗ trợ file .xlsx.");
        var sheets = read(file.getBytes(), SPECS);
        var labs = sheets.get("Laboratories");
        require(!labs.isEmpty() && labs.size() <= 500, "INVALID_SPREADSHEET", "Cần 1–500 phòng thí nghiệm.");
        var areas = children(labs, sheets.get("ResearchAreas"));
        var equipment = children(labs, sheets.get("Equipment"));
        var courses = children(labs, sheets.get("Courses"));
        var publications = children(labs, sheets.get("Publications"));
        var parsed = new ArrayList<LaboratoryDetails>();
        var slugs = new HashSet<String>();
        for (var row : labs) {
            var key = row.required("key");
            var content = new LabContent(row.get("overview"), row.get("functions"), row.get("duties"),
                    row.get("researchDescription"), areas.get(key).stream().map(item -> item.required("area")).toList(),
                    equipment.get(key).stream().map(item -> new LabEquipment(item.required("name"), item.get("quantity"),
                            item.get("description"), uuid(item.get("imageId"), item, "imageId"), item.get("imageAlt"))).toList(),
                    courses.get(key).stream().map(item -> new LabCourse(item.required("name"), item.get("code"),
                            choice(item.required("level"), LabCourse.Level.class, item, "level"), item.get("description"))).toList(),
                    publications.get(key).stream().map(item -> new LabPublication(item.required("citation"), item.get("year"), item.get("url"))).toList(),
                    row.get("additionalNotes"));
            var detail = new LaboratoryDetails(row.required("name"), row.required("slug"), row.get("shortName"),
                    row.get("lead"), row.get("location"), row.get("email"), row.get("phone"), row.get("summary"),
                    uuid(row.get("coverId"), row, "coverId"), row.get("coverAlt"),
                    row.get("template").isBlank() ? "EDITORIAL" : row.get("template"), List.of(),
                    uuid(row.get("sourceArticleId"), row, "sourceArticleId"), content);
            require(slugs.add(detail.slug()), "INVALID_SPREADSHEET", "Đường dẫn bị trùng trong file: " + detail.slug());
            parsed.add(detail);
        }
        var ids = new ArrayList<UUID>();
        for (var detail : parsed) {
            var created = service.create(actor, locale);
            ids.add(service.save(actor, created.id(), created.version(), detail).id());
        }
        return Map.of("created", ids.size(), "ids", ids);
    }
}
