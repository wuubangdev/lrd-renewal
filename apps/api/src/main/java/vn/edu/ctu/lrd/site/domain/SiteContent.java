package vn.edu.ctu.lrd.site.domain;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public sealed interface SiteContent permits HomeComposition, NavigationMenu {
    void validateForPublication();

    List<SiteLink> links();

    Set<UUID> assetIds();
}
