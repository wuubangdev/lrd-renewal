package vn.edu.ctu.lrd.site.api;

import java.util.UUID;

public interface RouteCatalog {
    default void publish(UUID id, String locale, String slug) {
        publish(id, locale, "articles", slug);
    }

    void publish(UUID id, String locale, String namespace, String slug);

    void withdraw(UUID id);

    default UUID resolve(String locale, String slug) {
        return resolve(locale, "articles", slug);
    }

    UUID resolve(String locale, String namespace, String slug);
}
