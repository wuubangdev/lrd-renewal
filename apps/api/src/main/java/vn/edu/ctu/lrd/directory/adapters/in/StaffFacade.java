package vn.edu.ctu.lrd.directory.adapters.in;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.lrd.directory.application.StaffService;
import vn.edu.ctu.lrd.directory.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class StaffFacade {
    private final StaffService service;
    public StaffFacade(StaffService service) { this.service = service; }
    public StaffProfile create(Actor actor, String locale) { return service.create(actor, locale); }
    @Transactional(readOnly = true)
    public StaffProfile get(Actor actor, UUID id) { return service.get(actor, id); }
    @Transactional(readOnly = true)
    public List<StaffProfile> list(Actor actor, String locale) { return service.list(actor, locale); }
    @Transactional(readOnly = true)
    public List<StaffProfile> publicList(String locale) { return service.publicList(locale); }
    @Transactional(readOnly = true)
    public StaffProfile publicOne(String locale, String slug) { return service.publicOne(locale, slug); }
    public StaffProfile save(Actor actor, UUID id, long version, StaffDetails details) { return service.save(actor,id,version,details); }
    public StaffProfile publish(Actor actor, UUID id, long version, long draftVersion) { return service.publish(actor,id,version,draftVersion); }
    public StaffProfile withdraw(Actor actor, UUID id, long version) { return service.withdraw(actor,id,version); }
}
