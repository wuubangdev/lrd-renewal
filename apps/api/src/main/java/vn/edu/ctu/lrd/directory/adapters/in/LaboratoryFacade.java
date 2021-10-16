package vn.edu.ctu.lrd.directory.adapters.in;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.lrd.directory.application.LaboratoryService;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import java.util.*;

@Service
@Transactional
public class LaboratoryFacade {
    private final LaboratoryService service;
    public LaboratoryFacade(LaboratoryService service) { this.service = service; }
    public LaboratoryProfile create(Actor actor, String locale) { return service.create(actor, locale); }
    @Transactional(readOnly = true)
    public LaboratoryProfile get(Actor actor, UUID id) { return service.get(actor, id); }
    @Transactional(readOnly = true)
    public List<LaboratoryProfile> list(Actor actor, String locale) { return service.list(actor, locale); }
    @Transactional(readOnly = true)
    public List<LaboratoryProfile> publicList(String locale) { return service.publicList(locale); }
    @Transactional(readOnly = true)
    public LaboratoryProfile publicOne(String locale, String slug) { return service.publicOne(locale, slug); }
    public LaboratoryProfile save(Actor actor, UUID id, long version, LaboratoryDetails details) { return service.save(actor,id,version,details); }
    public LaboratoryProfile publish(Actor actor, UUID id, long version, long draftVersion) { return service.publish(actor,id,version,draftVersion); }
    public LaboratoryProfile withdraw(Actor actor, UUID id, long version) { return service.withdraw(actor,id,version); }
}
