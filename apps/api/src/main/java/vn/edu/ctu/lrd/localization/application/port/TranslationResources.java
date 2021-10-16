package vn.edu.ctu.lrd.localization.application.port;

import java.util.Optional;
import java.util.UUID;
import vn.edu.ctu.lrd.localization.domain.*;

public interface TranslationResources {
    Optional<TranslationResource> resource(TranslationKind kind, UUID id);
}
