package vn.edu.ctu.lrd.directory.api;

import java.util.Optional;
import java.util.UUID;

public interface DirectoryCatalog {
    boolean staffExists(String locale, UUID id);
    Optional<String> publishedLaboratorySlug(String locale, UUID id);
    Optional<String> publishedStaffSlug(String locale, UUID id);
    Optional<UUID> publishedStaffId(String locale, String slug);
}
