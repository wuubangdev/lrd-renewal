package vn.edu.ctu.lrd.research.application.port;

import vn.edu.ctu.lrd.research.domain.*;
import java.util.*;

public interface ResearchRepository {
    ResearchRecord get(UUID id);
    List<ResearchRecord> list(ResearchKind kind, String locale, boolean publicOnly, int page, int size);
    long count(ResearchKind kind, String locale, boolean publicOnly);
    List<ResearchRecord> byStaff(UUID staffId, String locale);
    Optional<ResearchRecord> published(String locale, String slug);
    boolean slugTaken(String locale, String slug, UUID except);
    boolean sourceTaken(String sourceKey, UUID except);
    void insert(ResearchRecord record);
    void save(ResearchRecord record, long expectedVersion);
}
