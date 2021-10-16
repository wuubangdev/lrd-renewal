package vn.edu.ctu.lrd.site.adapters;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.sharedkernel.DomainException;
import vn.edu.ctu.lrd.site.api.RouteCatalog;

import java.util.UUID;

@Repository
public class RoutePersistence implements RouteCatalog {
    private final JdbcClient jdbc;

    public RoutePersistence(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void publish(UUID id, String locale, String namespace, String slug) {
        var owner =
                jdbc.sql(
                                "select source_id from site.public_route where locale=:locale and"
                                        + " namespace=:namespace and slug=:slug")
                        .param("locale", locale)
                        .param("namespace", namespace)
                        .param("slug", slug)
                        .query(UUID.class)
                        .optional();
        DomainException.require(
                owner.isEmpty() || owner.get().equals(id),
                "SLUG_CONFLICT",
                "Đường dẫn này đã được nội dung khác sử dụng.");
        jdbc.sql("update site.public_route set canonical=false,active=true where source_id=:id")
                .param("id", id)
                .update();
        int changed =
                jdbc.sql(
                                "insert into"
                                    + " site.public_route(locale,namespace,slug,source_id,canonical,active)"
                                    + " values(:locale,:namespace,:slug,:id,true,true) on"
                                    + " conflict(locale,namespace,slug) do update set"
                                    + " canonical=true,active=true where"
                                    + " site.public_route.source_id=excluded.source_id")
                        .param("locale", locale)
                        .param("namespace", namespace)
                        .param("slug", slug)
                        .param("id", id)
                        .update();
        DomainException.require(
                changed == 1, "SLUG_CONFLICT", "Đường dẫn này vừa được nội dung khác sử dụng.");
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void withdraw(UUID id) {
        jdbc.sql("update site.public_route set active=false where source_id=:id")
                .param("id", id)
                .update();
    }

    public UUID resolve(String locale, String namespace, String slug) {
        return jdbc.sql(
                        "select source_id from site.public_route where locale=:locale and"
                                + " namespace=:namespace and slug=:slug and active")
                .param("locale", locale)
                .param("namespace", namespace)
                .param("slug", slug)
                .query(UUID.class)
                .optional()
                .orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy nội dung."));
    }
}
