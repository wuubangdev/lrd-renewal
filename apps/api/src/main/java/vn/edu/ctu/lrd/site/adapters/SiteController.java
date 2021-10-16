package vn.edu.ctu.lrd.site.adapters;

import org.springframework.web.bind.annotation.*;

import tools.jackson.databind.JsonNode;

import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import vn.edu.ctu.lrd.site.domain.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class SiteController {
    private final SiteFacade site;
    private final SiteJson codec;
    private final ActorResolver actors;

    public SiteController(SiteFacade site, SiteJson codec, ActorResolver actors) {
        this.site = site;
        this.codec = codec;
        this.actors = actors;
    }

    public record PublishRequest(long draftVersion) {}

    public record RestoreRequest(UUID releaseId) {}

    @GetMapping("/admin/site/{kind}")
    SiteFacade.View get(
            @PathVariable String kind, @RequestParam(defaultValue = "vi") String locale) {
        return site.get(actors.current(), kind(kind), locale);
    }

    @PatchMapping("/admin/site/{kind}")
    SiteFacade.View save(
            @PathVariable String kind,
            @RequestParam(defaultValue = "vi") String locale,
            @RequestHeader(value = "If-Match", required = false) String match,
            @RequestBody JsonNode content) {
        var type = kind(kind);
        return site.save(
                actors.current(),
                type,
                locale,
                codec.decode(content.toString(), type),
                version(match));
    }

    @PostMapping("/admin/site/{kind}/publish")
    SiteFacade.View publish(
            @PathVariable String kind,
            @RequestParam(defaultValue = "vi") String locale,
            @RequestHeader(value = "If-Match", required = false) String match,
            @RequestBody PublishRequest body) {
        return site.publish(
                actors.current(), kind(kind), locale, version(match), body.draftVersion());
    }

    @GetMapping("/admin/site/{kind}/releases")
    List<SiteFacade.ReleaseView> history(
            @PathVariable String kind, @RequestParam(defaultValue = "vi") String locale) {
        return site.history(actors.current(), kind(kind), locale);
    }

    @PostMapping("/admin/site/{kind}/restore")
    SiteFacade.View restore(
            @PathVariable String kind,
            @RequestParam(defaultValue = "vi") String locale,
            @RequestHeader(value = "If-Match", required = false) String match,
            @RequestBody RestoreRequest body) {
        return site.restore(actors.current(), kind(kind), locale, body.releaseId(), version(match));
    }

    @GetMapping("/admin/site/{kind}/preview")
    SiteFacade.RenderView preview(
            @PathVariable String kind, @RequestParam(defaultValue = "vi") String locale) {
        return site.preview(actors.current(), kind(kind), locale);
    }

    @GetMapping("/public/site/{kind}")
    SiteFacade.RenderView published(
            @PathVariable String kind, @RequestParam(defaultValue = "vi") String locale) {
        return site.published(kind(kind), locale);
    }

    private SiteDocument.Kind kind(String kind) {
        return switch (kind) {
            case "home" -> SiteDocument.Kind.HOME;
            case "menu" -> SiteDocument.Kind.MENU;
            default -> throw new DomainException("NOT_FOUND", "Không tìm thấy cấu hình.");
        };
    }

    private long version(String value) {
        DomainException.require(
                value != null, "PRECONDITION_REQUIRED", "Thiếu phiên bản tài liệu.");
        try {
            return Long.parseLong(value.replace("\"", ""));
        } catch (NumberFormatException ex) {
            throw new DomainException("INVALID_VERSION", "Phiên bản không hợp lệ.");
        }
    }
}
