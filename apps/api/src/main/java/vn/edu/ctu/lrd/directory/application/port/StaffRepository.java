package vn.edu.ctu.lrd.directory.application.port;

import vn.edu.ctu.lrd.directory.domain.StaffProfile;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StaffRepository {
    StaffProfile get(UUID id);
    Optional<StaffProfile> published(String locale, String slug);
    List<StaffProfile> list(String locale, boolean publicOnly);
    boolean slugTaken(String locale, String slug, UUID except);
    void insert(StaffProfile profile);
    void save(StaffProfile profile, long expectedVersion);
}
