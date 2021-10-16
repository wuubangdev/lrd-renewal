package vn.edu.ctu.lrd.publishing.adapters.in.web;

import static vn.edu.ctu.lrd.publishing.adapters.in.web.ContentViews.*;

import org.springframework.web.bind.annotation.*;

import vn.edu.ctu.lrd.discovery.api.SearchCatalog;
import vn.edu.ctu.lrd.site.api.RouteCatalog;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public")
public class PublicContentController {
    private final PublishingFacade facade;
    private final RouteCatalog routes;
    private final SearchCatalog search;

    public PublicContentController(
            PublishingFacade facade, RouteCatalog routes, SearchCatalog search) {
        this.facade = facade;
        this.routes = routes;
        this.search = search;
    }

    @GetMapping({"/content", "/search"})
    SearchCatalog.Result list(
            @RequestParam(defaultValue = "vi") String locale,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return search.search(locale, q, category, page, size);
    }

    @GetMapping("/content/{id}")
    PublicView get(@PathVariable UUID id) {
        return published(facade.publicEntry(id));
    }

    @GetMapping("/content/by-slug/{slug}")
    PublicView slug(@PathVariable String slug, @RequestParam(defaultValue = "vi") String locale) {
        return published(facade.publicEntry(routes.resolve(locale, slug)));
    }
}
