package vn.edu.ctu.lrd.localization.application;

import java.util.Optional;
import java.util.UUID;
import vn.edu.ctu.lrd.localization.application.port.*;
import vn.edu.ctu.lrd.localization.domain.*;
import vn.edu.ctu.lrd.sharedkernel.*;
import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

public final class TranslationLinkService {
    private final TranslationResources resources;
    private final TranslationLinks links;
    public TranslationLinkService(TranslationResources resources, TranslationLinks links) {
        this.resources = resources; this.links = links;
    }
    private TranslationResource source(Actor actor, TranslationKind kind, UUID id) {
        kind.authorize(actor);
        kind.requireLinkable();
        var source = resource(kind, id);
        source.requireEditableBy(actor);
        require("vi".equals(source.locale()), "INVALID_TRANSLATION_LINK", "Nguồn phải là bản tiếng Việt.");
        return source;
    }
    private TranslationResource resource(TranslationKind kind, UUID id) {
        return resources.resource(kind, id).orElseThrow(() ->
                new DomainException("NOT_FOUND", "Không tìm thấy đối tượng cần liên kết bản dịch."));
    }
    public Optional<TranslationLink> find(Actor actor, TranslationKind kind, UUID sourceId) {
        var source = source(actor, kind, sourceId);
        var found = links.find(kind, sourceId);
        found.ifPresent(link -> {
            var target = resource(kind, link.targetId());
            target.requireEditableBy(actor);
            target.requireEnglishVersionOf(source);
        });
        return found;
    }
    public TranslationLink link(Actor actor, TranslationLink link) {
        var source = source(actor, link.kind(), link.sourceId());
        var target = resource(link.kind(), link.targetId());
        target.requireEditableBy(actor);
        target.requireEnglishVersionOf(source);
        links.insert(link);
        return link;
    }
}
