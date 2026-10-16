package vn.edu.ctu.lrd.localization.adapters.in;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.localization.application.EnglishTranslationService;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/localization")
public class EnglishTranslationController {
    private final EnglishTranslationService translation;
    private final ActorResolver actors;
    private final JdbcClient jdbc;

    public EnglishTranslationController(EnglishTranslationService translation, ActorResolver actors, JdbcClient jdbc) {
        this.translation = translation;
        this.actors = actors;
        this.jdbc = jdbc;
    }

    public record Request(String kind, Map<String, Object> source) {}
    public record Link(String kind, UUID sourceId, UUID targetId) {}

    @PostMapping("/english")
    Map<String, Object> translate(@RequestBody Request request) {
        authorize(request.kind());
        if (request.source() == null || request.source().isEmpty())
            throw new DomainException("INVALID_TRANSLATION", "Nội dung nguồn bị trống.");
        return translation.translate(request.kind(), request.source());
    }

    @GetMapping("/links/{kind}/{sourceId}")
    ResponseEntity<Link> linked(@PathVariable String kind, @PathVariable UUID sourceId) {
        authorize(kind);
        return jdbc.sql("select target_id from platform.translation_link where source_kind=:kind and source_id=:id")
                .param("kind", kind).param("id", sourceId).query(UUID.class).optional()
                .map(target -> ResponseEntity.ok(new Link(kind, sourceId, target)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/links")
    Link link(@RequestBody Link request) {
        authorize(request.kind());
        if (request.sourceId() == null || request.targetId() == null || request.sourceId().equals(request.targetId()))
            throw new DomainException("INVALID_TRANSLATION_LINK", "Liên kết bản dịch không hợp lệ.");
        jdbc.sql("insert into platform.translation_link(source_kind,source_id,target_id) "
                        + "values(:kind,:source,:target) on conflict (source_kind,source_id) do nothing")
                .param("kind", request.kind()).param("source", request.sourceId())
                .param("target", request.targetId()).update();
        var actual = linked(request.kind(), request.sourceId()).getBody();
        if (!actual.targetId().equals(request.targetId()))
            throw new DomainException("TRANSLATION_EXISTS", "Đã có bản tiếng Anh khác cho nội dung này.");
        return actual;
    }

    private void authorize(String kind) {
        var permission = switch (kind) {
            case "ARTICLE" -> "content:create";
            case "STAFF", "LABORATORY" -> "directory:manage";
            case "PROGRAM", "ADMISSION" -> "academics:manage";
            case "EDITORIAL" -> "editorial:manage";
            case "RESEARCH" -> "research:manage";
            case "HOME", "MENU" -> "site:manage";
            default -> throw new DomainException("INVALID_TRANSLATION_KIND", "Loại nội dung không được hỗ trợ.");
        };
        actors.current().require(permission);
    }
}
