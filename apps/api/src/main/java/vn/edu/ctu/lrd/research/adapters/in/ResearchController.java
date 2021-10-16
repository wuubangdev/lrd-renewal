package vn.edu.ctu.lrd.research.adapters.in;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import vn.edu.ctu.lrd.research.domain.*;
import vn.edu.ctu.lrd.directory.api.DirectoryCatalog;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.time.Instant;
import java.util.*;

@RestController
public class ResearchController {
    private final ResearchFacade facade;
    private final ActorResolver actors;
    private final DirectoryCatalog directory;
    public ResearchController(ResearchFacade facade, ActorResolver actors, DirectoryCatalog directory) {
        this.facade = facade; this.actors = actors; this.directory = directory;
    }
    public record CreateRequest(ResearchKind kind, String locale) {}
    public record PublishRequest(long draftVersion) {}
    public record Page<T>(List<T> items, long total, int page, int size) {}
    public record PublicContributor(String name, Contributor.Role role, UUID staffId, String staffUrl) {}
    public record PublicView(UUID id, ResearchKind kind, String locale, ResearchDetails details,
            List<PublicContributor> authors, Instant publishedAt) {}
    private PublicView view(ResearchRecord record) {
        var authors = record.live().contributors().stream().map(c -> new PublicContributor(
                c.name(), c.role(), c.staffId(), c.staffId() == null ? null :
                directory.publishedStaffSlug(record.locale(), c.staffId())
                        .map(slug -> "/" + record.locale() + "/can-bo/" + slug).orElse(null))).toList();
        return new PublicView(record.id(), record.kind(), record.locale(), record.live(), authors, record.publishedAt());
    }
    private int page(int value) { return Math.max(0, value); }
    private int size(int value) { return Math.max(1, Math.min(100, value)); }
    @GetMapping("/api/v1/public/research")
    Page<PublicView> publicList(@RequestParam ResearchKind kind, @RequestParam(defaultValue="vi") String locale,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        return new Page<>(facade.publicList(kind,locale,page(page),size(size)).stream().map(this::view).toList(),
                facade.publicCount(kind,locale),page(page),size(size));
    }
    @GetMapping("/api/v1/public/research/by-staff/{id}")
    List<PublicView> byStaff(@PathVariable UUID id, @RequestParam(defaultValue="vi") String locale) {
        return facade.byStaff(id,locale).stream().map(this::view).toList();
    }
    @GetMapping("/api/v1/public/research/{slug}")
    PublicView publicOne(@PathVariable String slug, @RequestParam(defaultValue="vi") String locale) {
        return view(facade.publicOne(locale,slug));
    }
    @GetMapping("/api/v1/admin/research")
    Page<ResearchRecord> list(@RequestParam ResearchKind kind, @RequestParam(defaultValue="vi") String locale,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        var actor = actors.current();
        return new Page<>(facade.list(actor,kind,locale,page(page),size(size)),
                facade.count(actor,kind,locale),page(page),size(size));
    }
    @PostMapping("/api/v1/admin/research")
    ResponseEntity<ResearchRecord> create(@RequestBody CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facade.create(actors.current(),request.kind(),request.locale()));
    }
    @GetMapping("/api/v1/admin/research/{id}")
    ResearchRecord get(@PathVariable UUID id) { return facade.get(actors.current(),id); }
    @PatchMapping("/api/v1/admin/research/{id}/draft")
    ResearchRecord save(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match,
            @RequestBody ResearchDetails details) { return facade.save(actors.current(),id,version(match),details); }
    @PostMapping("/api/v1/admin/research/{id}/publish")
    ResearchRecord publish(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match,
            @RequestBody PublishRequest request) {
        return facade.publish(actors.current(),id,version(match),request.draftVersion());
    }
    @PostMapping("/api/v1/admin/research/{id}/withdraw")
    ResearchRecord withdraw(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match) {
        return facade.withdraw(actors.current(),id,version(match));
    }
    private long version(String match) {
        if (match == null) throw new DomainException("PRECONDITION_REQUIRED", "Thiếu phiên bản hồ sơ.");
        try { return Long.parseLong(match.replace("\"", "")); }
        catch (NumberFormatException e) { throw new DomainException("STALE_VERSION", "Phiên bản hồ sơ không hợp lệ."); }
    }
}
