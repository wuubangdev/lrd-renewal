package vn.edu.ctu.lrd.publishing.adapters.in.web;

import static vn.edu.ctu.lrd.publishing.adapters.in.web.ContentViews.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.publishing.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.util.List;
import java.util.UUID;
import java.io.IOException;
import vn.edu.ctu.lrd.publishing.application.port.DocxReader;

@RestController
@RequestMapping("/api/v1/admin/content")
public class AdminContentController {
    private final PublishingFacade facade;
    private final ActorResolver actors;

    public AdminContentController(PublishingFacade facade, ActorResolver actors) {
        this.facade = facade;
        this.actors = actors;
    }

    public record CreateRequest(@NotBlank String locale) {}

    public record DraftRequest(
            @Size(max = 200) String title,
            @NotBlank String slug,
            @Size(max = 360) String summary,
            @NotBlank String category,
            @NotNull DocumentNode document,
            UUID coverId,
            @Size(max = 300) String coverAlt,
            @Size(max = 200) String byline,
            ContentOrigin origin) {
        ContentDraft draft() {
            return new ContentDraft(
                    title,
                    slug,
                    summary,
                    category,
                    new RichDocument(document),
                    coverId,
                    coverAlt,
                    byline,
                    origin);
        }
    }

    public record PublishRequest(@Min(1) long draftVersion) {}

    public record RestoreRequest(@NotNull UUID revisionId) {}

    public record ContentPage(List<AdminView> items, long total, int page, int size) {}

    @GetMapping
    ContentPage list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "") String status) {
        var result = facade.list(actors.current(), page, size, q, category, status);
        return new ContentPage(
                result.items().stream().map(ContentViews::admin).toList(),
                result.total(),
                page,
                size);
    }

    @PostMapping
    ResponseEntity<AdminView> create(@Valid @RequestBody CreateRequest body) {
        return response(facade.create(actors.current(), body.locale()), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    ResponseEntity<AdminView> get(@PathVariable UUID id) {
        return response(facade.get(actors.current(), id), HttpStatus.OK);
    }

    @PostMapping(value = "/{id}/import-docx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<DocxReader.Imported> importDocx(@PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean enhance, @RequestPart("file") MultipartFile file) {
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(facade.importDocx(actors.current(), id, file.getOriginalFilename(), file.getBytes(), enhance));
        } catch (IOException e) {
            throw new DomainException("INVALID_DOCX", "Không thể đọc tệp Word đã tải lên.");
        }
    }

    public record ImportCapabilities(boolean geminiAvailable) {}

    @GetMapping("/import-capabilities")
    ImportCapabilities importCapabilities() {
        actors.current().require("content:create");
        return new ImportCapabilities(facade.aiImportAvailable());
    }

    @PatchMapping("/{id}/draft")
    ResponseEntity<AdminView> save(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody DraftRequest body) {
        return response(
                facade.save(actors.current(), id, version(match), body.draft()), HttpStatus.OK);
    }

    @PostMapping("/{id}/publish")
    ResponseEntity<AdminView> publish(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @RequestHeader(value = "Idempotency-Key", required = false) String key,
            @Valid @RequestBody PublishRequest body) {
        return response(
                facade.publish(actors.current(), id, version(match), body.draftVersion(), key),
                HttpStatus.OK);
    }

    @PostMapping("/{id}/withdraw")
    ResponseEntity<AdminView> withdraw(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match) {
        return response(facade.withdraw(actors.current(), id, version(match)), HttpStatus.OK);
    }

    @GetMapping("/{id}/revisions")
    List<RevisionView> revisions(@PathVariable UUID id) {
        return facade.revisions(actors.current(), id).stream().map(ContentViews::revision).toList();
    }

    @PostMapping("/{id}/restore-revision")
    ResponseEntity<AdminView> restore(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody RestoreRequest body) {
        return response(
                facade.restore(actors.current(), id, version(match), body.revisionId()),
                HttpStatus.OK);
    }

    private long version(String match) {
        if (match == null)
            throw new DomainException("PRECONDITION_REQUIRED", "Thiếu phiên bản bài viết.");
        try {
            return Long.parseLong(match.replace("\"", ""));
        } catch (NumberFormatException e) {
            throw new DomainException("STALE_VERSION", "Phiên bản bài viết không hợp lệ.");
        }
    }

    private ResponseEntity<AdminView> response(ContentEntry e, HttpStatus status) {
        return ResponseEntity.status(status)
                .eTag(Long.toString(e.version()))
                .cacheControl(CacheControl.noStore())
                .body(admin(e));
    }
}
