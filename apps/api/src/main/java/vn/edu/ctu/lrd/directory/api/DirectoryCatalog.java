package vn.edu.ctu.lrd.directory.api;

import java.util.Optional;
import java.util.UUID;

public interface DirectoryCatalog {
    Optional<String> publishedLaboratorySlug(String locale, UUID id);
    Optional<String> publishedStaffSlug(String locale, UUID id);
    Optional<UUID> publishedStaffId(String locale, String slug);
}
