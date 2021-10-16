package vn.edu.ctu.lrd.directory.application.port;

import vn.edu.ctu.lrd.directory.domain.LaboratoryProfile;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LaboratoryRepository {
    LaboratoryProfile get(UUID id);
    Optional<LaboratoryProfile> published(String locale, String slug);
    List<LaboratoryProfile> list(String locale, boolean publicOnly);
    boolean slugTaken(String locale, String slug, UUID except);
    void insert(LaboratoryProfile profile);
    void save(LaboratoryProfile profile, long expectedVersion);
}
