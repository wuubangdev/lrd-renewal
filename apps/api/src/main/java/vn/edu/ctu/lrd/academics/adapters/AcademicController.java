package vn.edu.ctu.lrd.academics.adapters;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import tools.jackson.databind.JsonNode;

import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.discovery.api.EducationCatalog;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class AcademicController {
    private final AcademicFacade academics;
    private final ActorResolver actors;
    private final AcademicJson json;
    private final EducationCatalog catalog;
    private final Clock clock;

    public AcademicController(
            AcademicFacade academics,
            ActorResolver actors,
            AcademicJson json,
            EducationCatalog catalog,
            Clock clock) {
        this.academics = academics;
        this.actors = actors;
        this.json = json;
        this.catalog = catalog;
        this.clock = clock;
    }

    public record Create(
            @NotBlank String code,
            @Pattern(regexp = "vi|en") @NotNull String locale,
            @NotNull EducationLevel level) {}

    public record Publish(long draftVersion) {}

    public record Restore(@NotNull UUID editionId) {}

    public record Reason(@NotBlank @Size(min = 5, max = 1000) String reason) {}

    public record Extend(
            @NotNull Instant deadline, @NotBlank @Size(min = 5, max = 1000) String reason) {}

    @PostMapping("/admin/academics/{kind}")
    @ResponseStatus(HttpStatus.CREATED)
    AcademicFacade.View create(@PathVariable String kind, @Valid @RequestBody Create body) {
        return academics.create(
                actors.current(), kind(kind), body.code(), body.locale(), body.level());
    }

    @GetMapping("/admin/academics/{kind}")
    AcademicFacade.Page list(
            @PathVariable String kind,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return academics.list(actors.current(), kind(kind), q, locale, page, size);
    }

    @GetMapping("/admin/academics/{kind}/{id}")
    AcademicFacade.View get(@PathVariable String kind, @PathVariable UUID id) {
        return academics.get(actors.current(), kind(kind), id);
    }

    @PatchMapping("/admin/academics/{kind}/{id}")
    AcademicFacade.View save(
            @PathVariable String kind,
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @RequestBody JsonNode body) {
        var actor = actors.current();
        actor.require("academics:manage");
        return kind(kind).equals("programs")
                ? academics.reviseProgram(
                        actor, id, json.decode(body.toString(), ProgramDraft.class), version(match))
                : academics.reviseAdmission(
                        actor,
                        id,
                        json.decode(body.toString(), AdmissionDraft.class),
                        version(match));
    }

    @PostMapping("/admin/academics/{kind}/{id}/publish")
    AcademicFacade.View publish(
            @PathVariable String kind,
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @RequestBody Publish body) {
        return academics.publish(
                actors.current(), kind(kind), id, version(match), body.draftVersion());
    }

    @GetMapping("/admin/academics/{kind}/{id}/editions")
    List<AcademicFacade.History> history(@PathVariable String kind, @PathVariable UUID id) {
        return academics.history(actors.current(), kind(kind), id);
    }

    @PostMapping("/admin/academics/{kind}/{id}/restore")
    AcademicFacade.View restore(
            @PathVariable String kind,
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody Restore body) {
        return academics.restore(
                actors.current(), kind(kind), id, version(match), body.editionId());
    }

    @GetMapping("/admin/academics/{kind}/{id}/preview")
    Object preview(@PathVariable String kind, @PathVariable UUID id) {
        return academics.preview(actors.current(), kind(kind), id);
    }

    @PostMapping("/admin/academics/programs/{id}/retire")
    AcademicFacade.View retire(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody Reason body) {
        return academics.retire(actors.current(), id, version(match), body.reason());
    }

    @PostMapping("/admin/academics/programs/{id}/reinstate")
    AcademicFacade.View reinstate(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match) {
        return academics.reinstate(actors.current(), id, version(match));
    }

    @PostMapping("/admin/academics/admissions/{id}/extend")
    AcademicFacade.View extend(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody Extend body) {
        return academics.extend(
                actors.current(), id, version(match), body.deadline(), body.reason());
    }

    @PostMapping("/admin/academics/admissions/{id}/close")
    AcademicFacade.View close(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody Reason body) {
        return academics.close(actors.current(), id, version(match), body.reason());
    }

    @PostMapping("/admin/academics/admissions/{id}/withdraw")
    AcademicFacade.View withdraw(
            @PathVariable UUID id,
            @RequestHeader(value = "If-Match", required = false) String match,
            @Valid @RequestBody Reason body) {
        return academics.withdraw(actors.current(), id, version(match), body.reason());
    }

    @GetMapping("/public/academics/{kind}")
    EducationCatalog.Result search(
            @PathVariable String kind,
            @RequestParam(defaultValue = "vi") String locale,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String level,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) UUID program,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return catalog.search(
                locale,
                kind(kind).equals("programs") ? "PROGRAM" : "ADMISSION",
                q,
                level,
                status,
                year,
                program,
                page,
                size,
                clock.instant());
    }

    @GetMapping("/public/academics/programs/{slug}")
    AcademicFacade.ProgramView program(
            @PathVariable String slug, @RequestParam(defaultValue = "vi") String locale) {
        return academics.publicProgram(locale, slug);
    }

    @GetMapping("/public/academics/{kind}/lookup/by-id")
    List<EducationCatalog.Document> references(
            @PathVariable String kind,
            @RequestParam(defaultValue = "vi") String locale,
            @RequestParam Set<UUID> ids) {
        DomainException.require(ids.size() <= 30, "INVALID_QUERY", "Chỉ chọn tối đa 30 nội dung.");
        return catalog.findPublished(
                locale, kind(kind).equals("programs") ? "PROGRAM" : "ADMISSION", ids);
    }

    @GetMapping("/public/academics/admissions/{slug}")
    AcademicFacade.AdmissionView admission(
            @PathVariable String slug, @RequestParam(defaultValue = "vi") String locale) {
        return academics.publicAdmission(locale, slug);
    }

    private String kind(String kind) {
        DomainException.require(
                Set.of("programs", "admissions").contains(kind),
                "NOT_FOUND",
                "Không tìm thấy loại nội dung.");
        return kind;
    }

    private long version(String value) {
        DomainException.require(
                value != null, "PRECONDITION_REQUIRED", "Thiếu phiên bản tài liệu.");
        try {
            return Long.parseLong(value.replace("\"", ""));
        } catch (NumberFormatException e) {
            throw new DomainException("INVALID_VERSION", "Phiên bản không hợp lệ.");
        }
    }
}
