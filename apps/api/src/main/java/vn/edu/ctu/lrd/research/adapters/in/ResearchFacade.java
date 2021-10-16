package vn.edu.ctu.lrd.research.adapters.in;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.lrd.research.application.ResearchService;
import vn.edu.ctu.lrd.research.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import java.util.*;

@Service
@Transactional
public class ResearchFacade {
    private final ResearchService service;
    public ResearchFacade(ResearchService service) { this.service = service; }
    public ResearchRecord create(Actor actor, ResearchKind kind, String locale) { return service.create(actor,kind,locale); }
    @Transactional(readOnly=true) public ResearchRecord get(Actor actor, UUID id) { return service.get(actor,id); }
    @Transactional(readOnly=true) public List<ResearchRecord> list(Actor actor, ResearchKind kind, String locale, int page, int size) { return service.list(actor,kind,locale,page,size); }
    @Transactional(readOnly=true) public long count(Actor actor, ResearchKind kind, String locale) { return service.count(actor,kind,locale); }
    @Transactional(readOnly=true) public List<ResearchRecord> publicList(ResearchKind kind, String locale, int page, int size) { return service.publicList(kind,locale,page,size); }
    @Transactional(readOnly=true) public long publicCount(ResearchKind kind, String locale) { return service.publicCount(kind,locale); }
    @Transactional(readOnly=true) public List<ResearchRecord> byStaff(UUID id, String locale) { return service.byStaff(id,locale); }
    @Transactional(readOnly=true) public ResearchRecord publicOne(String locale, String slug) { return service.publicOne(locale,slug); }
    public ResearchRecord save(Actor actor, UUID id, long version, ResearchDetails details) { return service.save(actor,id,version,details); }
    public ResearchRecord publish(Actor actor, UUID id, long version, long draftVersion) { return service.publish(actor,id,version,draftVersion); }
    public ResearchRecord withdraw(Actor actor, UUID id, long version) { return service.withdraw(actor,id,version); }
}
