package vn.edu.ctu.lrd.directory.adapters.in;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
public class StaffController {
    private final StaffFacade facade;
    private final ActorResolver actors;
    public StaffController(StaffFacade facade, ActorResolver actors) { this.facade = facade; this.actors = actors; }
    public record CreateRequest(String locale) {}
    public record PublishRequest(long draftVersion) {}
    public record PublicView(UUID id, String locale, StaffDetails details, Instant publishedAt) {
        static PublicView of(StaffProfile profile) {
            return new PublicView(profile.id(), profile.locale(), profile.live(), profile.publishedAt());
        }
    }
    @GetMapping("/api/v1/public/people")
    List<PublicView> publicList(@RequestParam(defaultValue = "vi") String locale) {
        return facade.publicList(locale).stream().map(PublicView::of).toList();
    }
    @GetMapping("/api/v1/public/people/{slug}")
    PublicView publicOne(@PathVariable String slug, @RequestParam(defaultValue = "vi") String locale) {
        return PublicView.of(facade.publicOne(locale, slug));
    }
    @GetMapping("/api/v1/admin/people")
    List<StaffProfile> list(@RequestParam(defaultValue = "vi") String locale) { return facade.list(actors.current(), locale); }
    @PostMapping("/api/v1/admin/people")
    ResponseEntity<StaffProfile> create(@RequestBody CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facade.create(actors.current(), request.locale()));
    }
    @GetMapping("/api/v1/admin/people/{id}")
    StaffProfile get(@PathVariable UUID id) { return facade.get(actors.current(), id); }
    @PatchMapping("/api/v1/admin/people/{id}/draft")
    StaffProfile save(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match,
                      @RequestBody StaffDetails details) {
        return facade.save(actors.current(), id, version(match), details);
    }
    @PostMapping("/api/v1/admin/people/{id}/publish")
    StaffProfile publish(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match,
                         @RequestBody PublishRequest request) {
        return facade.publish(actors.current(), id, version(match), request.draftVersion());
    }
    @PostMapping("/api/v1/admin/people/{id}/withdraw")
    StaffProfile withdraw(@PathVariable UUID id, @RequestHeader(value="If-Match",required=false) String match) {
        return facade.withdraw(actors.current(), id, version(match));
    }
    private long version(String match) {
        if (match == null) throw new DomainException("PRECONDITION_REQUIRED", "Thiếu phiên bản hồ sơ.");
        try { return Long.parseLong(match.replace("\"", "")); }
        catch (NumberFormatException e) { throw new DomainException("STALE_VERSION", "Phiên bản hồ sơ không hợp lệ."); }
    }
}
