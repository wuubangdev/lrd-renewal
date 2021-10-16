package vn.edu.ctu.lrd.localization.application.port;

import java.util.Optional;
import java.util.UUID;
import vn.edu.ctu.lrd.localization.domain.*;

public interface TranslationLinks {
    Optional<TranslationLink> find(TranslationKind kind, UUID sourceId);
    void insert(TranslationLink link);
}
