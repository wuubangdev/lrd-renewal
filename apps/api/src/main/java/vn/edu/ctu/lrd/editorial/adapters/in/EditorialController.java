package vn.edu.ctu.lrd.editorial.adapters.in;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import vn.edu.ctu.lrd.editorial.domain.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import vn.edu.ctu.lrd.discovery.api.SearchCatalog;
import java.time.Instant;
import java.util.*;

@RestController
public class EditorialController {
    private final EditorialFacade facade;
    private final ActorResolver actors;
    private final SearchCatalog search;
    public EditorialController(EditorialFacade facade, ActorResolver actors, SearchCatalog search) {
        this.facade = facade; this.actors = actors; this.search = search;
    }
    public record CreateRequest(EditorialKind kind, String locale) {}
    public record PublishRequest(long draftVersion) {}
    public record PublicView(UUID id, EditorialKind kind, String locale, EditorialDetails details,
            String articleUrl, Instant publishedAt) {}
    private Optional<PublicView> view(EditorialItem item) {
        return search.findPublished(item.locale(), Set.of(item.live().articleId())).stream().findFirst()
                .map(article -> new PublicView(item.id(), item.kind(), item.locale(), item.live(),
                        "/" + item.locale() + "/tin-tuc/" + article.slug(), item.publishedAt()));
    }
    @GetMapping("/api/v1/public/editorial")
    List<PublicView> publicList(@RequestParam EditorialKind kind, @RequestParam(defaultValue="vi") String locale) {
        return facade.publicList(kind, locale).stream().flatMap(item -> view(item).stream()).toList();
    }
    @GetMapping("/api/v1/public/editorial/{slug}")
    PublicView publicOne(@PathVariable String slug, @RequestParam EditorialKind kind,
            @RequestParam(defaultValue="vi") String locale) {
        return view(facade.publicOne(kind, locale, slug)).orElseThrow(() ->
                new DomainException("NOT_FOUND", "Bài viết liên kết chưa công khai."));
    }
    @GetMapping("/api/v1/admin/editorial")
    List<EditorialItem> list(@RequestParam EditorialKind kind, @RequestParam(defaultValue="vi") String locale) {
        return facade.list(actors.current(), kind, locale);
    }
    @PostMapping("/api/v1/admin/editorial")
    ResponseEntity<EditorialItem> create(@RequestBody CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facade.create(actors.current(), request.kind(), request.locale()));
    }
    @GetMapping("/api/v1/admin/editorial/{id}")
    EditorialItem get(@PathVariable UUID id) { return facade.get(actors.current(), id); }
    @PatchMapping("/api/v1/admin/editorial/{id}/draft")
    EditorialItem save(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match,
            @RequestBody EditorialDetails details) { return facade.save(actors.current(), id, version(match), details); }
    @PostMapping("/api/v1/admin/editorial/{id}/publish")
    EditorialItem publish(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match,
            @RequestBody PublishRequest request) {
        return facade.publish(actors.current(), id, version(match), request.draftVersion());
    }
    @PostMapping("/api/v1/admin/editorial/{id}/withdraw")
    EditorialItem withdraw(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match) {
        return facade.withdraw(actors.current(), id, version(match));
    }
    private long version(String match) {
        if (match == null) throw new DomainException("PRECONDITION_REQUIRED", "Thiếu phiên bản hồ sơ.");
        try { return Long.parseLong(match.replace("\"", "")); }
        catch (NumberFormatException e) { throw new DomainException("STALE_VERSION", "Phiên bản hồ sơ không hợp lệ."); }
    }
}
