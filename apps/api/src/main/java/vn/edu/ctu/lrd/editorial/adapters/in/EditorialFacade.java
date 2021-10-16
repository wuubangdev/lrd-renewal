package vn.edu.ctu.lrd.editorial.adapters.in;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.lrd.editorial.application.EditorialService;
import vn.edu.ctu.lrd.editorial.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import java.util.*;

@Service
@Transactional
public class EditorialFacade {
    private final EditorialService service;
    public EditorialFacade(EditorialService service) { this.service = service; }
    public EditorialItem create(Actor actor, EditorialKind kind, String locale) { return service.create(actor, kind, locale); }
    @Transactional(readOnly = true)
    public EditorialItem get(Actor actor, UUID id) { return service.get(actor, id); }
    @Transactional(readOnly = true)
    public List<EditorialItem> list(Actor actor, EditorialKind kind, String locale) { return service.list(actor, kind, locale); }
    @Transactional(readOnly = true)
    public List<EditorialItem> publicList(EditorialKind kind, String locale) { return service.publicList(kind, locale); }
    @Transactional(readOnly = true)
    public EditorialItem publicOne(EditorialKind kind, String locale, String slug) { return service.publicOne(kind, locale, slug); }
    public EditorialItem save(Actor actor, UUID id, long version, EditorialDetails details) { return service.save(actor,id,version,details); }
    public EditorialItem publish(Actor actor, UUID id, long version, long draftVersion) { return service.publish(actor,id,version,draftVersion); }
    public EditorialItem withdraw(Actor actor, UUID id, long version) { return service.withdraw(actor,id,version); }
}
