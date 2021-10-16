package vn.edu.ctu.lrd.editorial.adapters.in;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import static vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable.*;

import java.util.*;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.ctu.lrd.editorial.application.EditorialService;
import vn.edu.ctu.lrd.editorial.domain.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.platform.spreadsheet.WorkbookTable;
import vn.edu.ctu.lrd.sharedkernel.*;

@RestController
@RequestMapping("/api/v1/admin/editorial/events/spreadsheet")
public class EventSpreadsheet {
    private static final Spec[] SPECS = {
        new Spec("Events", "key", "title", "slug", "summary", "startsOn", "endsOn", "location", "organizer", "theme", "format", "audience", "registrationUrl", "externalUrl", "thumbnailId", "thumbnailAlt", "articleId"),
        new Spec("Speakers", "key", "name", "title", "affiliation", "topic"),
        new Spec("Sessions", "key", "time", "title", "speaker", "description")
    };
    private final EditorialService service;
    private final ActorResolver actors;
    public EventSpreadsheet(EditorialService service, ActorResolver actors) { this.service = service; this.actors = actors; }

    @GetMapping("/template")
    ResponseEntity<byte[]> template() {
        actors.current().require("editorial:manage");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=event-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(WorkbookTable.template("Mẫu hội thảo: ngày YYYY-MM-DD; format IN_PERSON, ONLINE hoặc HYBRID; articleId là UUID bài viết đã có.", SPECS));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    Map<String, Object> importFile(@RequestParam String locale, @RequestPart MultipartFile file) throws java.io.IOException {
        Actor actor = actors.current(); actor.require("editorial:manage");
        require(Set.of("vi", "en").contains(locale), "INVALID_LOCALE", "Ngôn ngữ không hợp lệ.");
        require(file.getOriginalFilename() != null && file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"),
                "INVALID_SPREADSHEET", "Chỉ hỗ trợ file .xlsx.");
        var sheets = read(file.getBytes(), SPECS);
        var events = sheets.get("Events");
        require(!events.isEmpty() && events.size() <= 500, "INVALID_SPREADSHEET", "Cần 1–500 hội thảo.");
        var speakers = children(events, sheets.get("Speakers"));
        var sessions = children(events, sheets.get("Sessions"));
        var parsed = new ArrayList<EditorialDetails>();
        var slugs = new HashSet<String>();
        for (var row : events) {
            var key = row.required("key");
            var details = new EditorialDetails(row.required("title"), row.required("slug"), row.get("summary"),
                    uuid(row.get("thumbnailId"), row, "thumbnailId"), row.get("thumbnailAlt"), row.get("externalUrl"),
                    uuid(row.get("articleId"), row, "articleId"), date(row.get("startsOn"), row, "startsOn"),
                    date(row.get("endsOn"), row, "endsOn"), row.get("location"), row.get("organizer"), null,
                    "", "", row.get("theme"), row.get("format"), row.get("audience"), row.get("registrationUrl"),
                    speakers.get(key).stream().map(item -> new EventSpeaker(item.required("name"), item.get("title"),
                            item.get("affiliation"), item.get("topic"))).toList(),
                    sessions.get(key).stream().map(item -> new EventSession(item.get("time"), item.required("title"),
                            item.get("speaker"), item.get("description"))).toList());
            require(slugs.add(details.slug()), "INVALID_SPREADSHEET", "Đường dẫn hội thảo bị trùng: " + details.slug());
            parsed.add(details);
        }
        var ids = new ArrayList<UUID>();
        for (var details : parsed) {
            var created = service.create(actor, EditorialKind.EVENT, locale);
            ids.add(service.save(actor, created.id(), created.version(), details).id());
        }
        return Map.of("created", ids.size(), "ids", ids);
    }
}
