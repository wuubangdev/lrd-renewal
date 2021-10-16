package vn.edu.ctu.lrd.directory.adapters.out;

import org.springframework.stereotype.Component;
import vn.edu.ctu.lrd.directory.api.DirectoryCatalog;
import vn.edu.ctu.lrd.directory.application.port.LaboratoryRepository;
import vn.edu.ctu.lrd.directory.application.port.StaffRepository;
import java.util.Optional;
import java.util.UUID;

@Component
public class DirectoryCatalogAdapter implements DirectoryCatalog {
    private final LaboratoryRepository labs;
    private final StaffRepository staff;
    public DirectoryCatalogAdapter(LaboratoryRepository labs, StaffRepository staff) { this.labs = labs; this.staff = staff; }
    public boolean staffExists(String locale, UUID id) {
        try { return staff.get(id).locale().equals(locale); }
        catch (vn.edu.ctu.lrd.sharedkernel.DomainException e) {
            if ("NOT_FOUND".equals(e.code())) return false;
            throw e;
        }
    }
    public Optional<String> publishedLaboratorySlug(String locale, UUID id) {
        var profile = labs.get(id);
        return profile.locale().equals(locale) && profile.live() != null
                ? Optional.of(profile.live().slug()) : Optional.empty();
    }
    public Optional<String> publishedStaffSlug(String locale, UUID id) {
        var profile = staff.get(id);
        return profile.locale().equals(locale) && profile.live() != null
                ? Optional.of(profile.live().slug()) : Optional.empty();
    }
    public Optional<UUID> publishedStaffId(String locale, String slug) {
        return staff.published(locale, slug).map(profile -> profile.id());
    }
}
