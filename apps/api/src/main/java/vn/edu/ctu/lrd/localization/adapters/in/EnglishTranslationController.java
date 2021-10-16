package vn.edu.ctu.lrd.localization.adapters.in;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.localization.application.EnglishTranslationService;
import vn.edu.ctu.lrd.localization.adapters.TranslationLinkFacade;
import vn.edu.ctu.lrd.localization.domain.TranslationKind;
import vn.edu.ctu.lrd.localization.domain.TranslationLink;
import vn.edu.ctu.lrd.sharedkernel.DomainException;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/localization")
public class EnglishTranslationController {
    private final EnglishTranslationService translation;
    private final ActorResolver actors;
    private final TranslationLinkFacade links;

    public EnglishTranslationController(EnglishTranslationService translation, ActorResolver actors, TranslationLinkFacade links) {
        this.translation = translation;
        this.actors = actors;
        this.links = links;
    }

    public record Request(String kind, Map<String, Object> source) {}

    @PostMapping("/english")
    Map<String, Object> translate(@RequestBody Request request) {
        authorize(request.kind());
        if (request.source() == null || request.source().isEmpty())
            throw new DomainException("INVALID_TRANSLATION", "Nội dung nguồn bị trống.");
        return translation.translate(request.kind(), request.source());
    }

    @GetMapping("/links/{kind}/{sourceId}")
    ResponseEntity<TranslationLink> linked(@PathVariable String kind, @PathVariable UUID sourceId) {
        return links.find(actors.current(), TranslationKind.parse(kind), sourceId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping("/links")
    TranslationLink link(@RequestBody TranslationLink request) {
        return links.link(actors.current(), request);
    }

    private void authorize(String kind) {
        TranslationKind.parse(kind).authorize(actors.current());
    }
}
