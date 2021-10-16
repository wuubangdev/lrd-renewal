package vn.edu.ctu.lrd.localization.adapters;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import vn.edu.ctu.lrd.localization.application.TranslationLinkService;
import vn.edu.ctu.lrd.localization.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;

@Service
public class TranslationLinkFacade {
    private final TranslationLinkService service;
    public TranslationLinkFacade(TranslationLinkService service) { this.service = service; }
    @Transactional(readOnly = true)
    public Optional<TranslationLink> find(Actor actor, TranslationKind kind, UUID sourceId) {
        return service.find(actor, kind, sourceId);
    }
    @Transactional
    public TranslationLink link(Actor actor, TranslationLink link) { return service.link(actor, link); }
}
