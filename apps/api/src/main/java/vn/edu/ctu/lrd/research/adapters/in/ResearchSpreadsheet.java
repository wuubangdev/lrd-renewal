package vn.edu.ctu.lrd.research.adapters.in;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import static vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable.*;

import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.ctu.lrd.directory.api.DirectoryCatalog;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable;
import vn.edu.ctu.lrd.research.application.ResearchService;
import vn.edu.ctu.lrd.research.domain.*;
import vn.edu.ctu.lrd.sharedkernel.*;

@RestController
@RequestMapping("/api/v1/admin/research/spreadsheet")
public class ResearchSpreadsheet {
    private static final Spec[] SPECS = {
        new Spec("Research", "key", "title", "slug", "summary", "year", "venue", "publisher", "volume", "doi", "isbn", "authorsText", "citation", "sourceUrl", "documentUrl", "level", "period", "progress", "coverId", "coverAlt", "sourceArticleId", "sourceKey"),
        new Spec("Contributors", "key", "name", "role", "staffSlug")
    };
    private final ResearchService service;
    private final DirectoryCatalog directory;
    private final ActorResolver actors;
    public ResearchSpreadsheet(ResearchService service, DirectoryCatalog directory, ActorResolver actors) {
        this.service = service; this.directory = directory; this.actors = actors;
    }

    @GetMapping("/template")
    ResponseEntity<byte[]> template() {
        actors.current().require("research:manage");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=research-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(WorkbookTable.template("Mẫu nhập công trình/đề tài. role: AUTHOR, EDITOR, PRINCIPAL_INVESTIGATOR, MEMBER. staffSlug để trống nếu không liên kết cán bộ.", SPECS));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    Map<String, Object> importFile(@RequestParam ResearchKind kind, @RequestParam String locale,
            @RequestPart MultipartFile file) throws java.io.IOException {
        Actor actor = actors.current(); actor.require("research:manage");
        require(Set.of("vi", "en").contains(locale), "INVALID_LOCALE", "Ngôn ngữ không hợp lệ.");
        require(file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"),
                "INVALID_SPREADSHEET", "Chỉ hỗ trợ file .xlsx.");
        var sheets = read(file.getBytes(), SPECS);
        var records = sheets.get("Research");
        require(!records.isEmpty() && records.size() <= 500, "INVALID_SPREADSHEET", "Cần 1–500 bản ghi trong sheet Research.");
        var contributors = children(records, sheets.get("Contributors"));
        var parsed = new ArrayList<ResearchDetails>();
        var slugs = new HashSet<String>();
        for (var record : records) {
            var people = new ArrayList<Contributor>();
            for (var row : contributors.get(record.get("key"))) {
                var staffSlug = row.get("staffSlug");
                var staffId = staffSlug.isBlank() ? null : directory.publishedStaffId(locale, staffSlug)
                        .orElseThrow(() -> new DomainException("INVALID_SPREADSHEET", "Dòng " + row.line() + ": không có cán bộ công khai với slug " + staffSlug));
                people.add(new Contributor(staffId, row.required("name"),
                        choice(row.required("role"), Contributor.Role.class, row, "role")));
            }
            String authors = record.get("authorsText");
            if (authors.isBlank() && !people.isEmpty()) authors = String.join(", ", people.stream().map(Contributor::name).toList());
            var detail = new ResearchDetails(record.required("title"), record.required("slug"), record.get("summary"),
                    integer(record.get("year"), record, "year"), record.get("venue"), record.get("publisher"),
                    record.get("volume"), record.get("doi"), record.get("isbn"), authors, record.get("citation"),
                    record.get("sourceUrl"), record.get("documentUrl"), record.get("level"), record.get("period"),
                    record.get("progress"), uuid(record.get("coverId"), record, "coverId"), record.get("coverAlt"),
                    people, uuid(record.get("sourceArticleId"), record, "sourceArticleId"), record.get("sourceKey"));
            require(slugs.add(detail.slug()), "INVALID_SPREADSHEET", "Đường dẫn nghiên cứu bị trùng trong file: " + detail.slug());
            parsed.add(detail);
        }
        var ids = new ArrayList<UUID>();
        for (var detail : parsed) {
            var created = service.create(actor, kind, locale);
            ids.add(service.save(actor, created.id(), created.version(), detail).id());
        }
        return Map.of("created", ids.size(), "ids", ids);
    }
}
