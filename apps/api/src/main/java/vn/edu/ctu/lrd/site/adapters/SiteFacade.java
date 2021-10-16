package vn.edu.ctu.lrd.site.adapters;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.discovery.api.SearchCatalog;
import vn.edu.ctu.lrd.sharedkernel.*;
import vn.edu.ctu.lrd.site.application.SiteService;
import vn.edu.ctu.lrd.site.application.port.*;
import vn.edu.ctu.lrd.site.domain.*;

import java.time.*;
import java.util.*;

@Service
@Transactional
public class SiteFacade {
    public record View(
            UUID id,
            SiteDocument.Kind kind,
            String locale,
            long version,
            long draftVersion,
            String status,
            SiteContent content,
            Instant updatedAt,
            Instant publishedAt) {}

    public record ReleaseView(UUID id, long draftVersion, Instant publishedAt) {}

    public record RenderView(
            String locale,
            SiteContent content,
            Map<String, String> urls,
            List<SearchCatalog.Document> news,
            Map<String, vn.edu.ctu.lrd.discovery.api.EducationCatalog.Document> education,
            List<vn.edu.ctu.lrd.discovery.api.EducationCatalog.Document> admissions) {}

    private final SiteService service;
    private final SiteRepository repository;
    private final SiteReferences references;

    public SiteFacade(SiteRepository repository, SiteReferences references) {
        this.repository = repository;
        this.references = references;
        service = new SiteService(repository, references, Clock.systemUTC());
    }

    @Transactional(readOnly = true)
    public View get(Actor a, SiteDocument.Kind kind, String locale) {
        return view(service.get(a, kind, locale));
    }

    public View save(
            Actor a, SiteDocument.Kind kind, String locale, SiteContent content, long version) {
        return view(service.revise(a, kind, locale, content, version));
    }

    public View publish(
            Actor a, SiteDocument.Kind kind, String locale, long version, long draftVersion) {
        return view(service.publish(a, kind, locale, version, draftVersion));
    }

    public View restore(
            Actor a, SiteDocument.Kind kind, String locale, UUID release, long version) {
        return view(service.restore(a, kind, locale, release, version));
    }

    @Transactional(readOnly = true)
    public List<ReleaseView> history(Actor a, SiteDocument.Kind kind, String locale) {
        return service.history(a, kind, locale).stream()
                .map(r -> new ReleaseView(r.id(), r.draftVersion(), r.publishedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public RenderView preview(Actor a, SiteDocument.Kind kind, String locale) {
        return render(service.get(a, kind, locale).draft(), locale, false);
    }

    @Transactional(readOnly = true)
    public RenderView published(SiteDocument.Kind kind, String locale) {
        var d =
                repository
                        .find(kind, locale)
                        .filter(v -> v.live() != null)
                        .orElseThrow(
                                () ->
                                        new DomainException(
                                                "NOT_FOUND",
                                                "Nội dung chưa được công khai bằng ngôn ngữ này."));
        return render(d.live().snapshot(), locale, true);
    }

    private RenderView render(SiteContent content, String locale, boolean published) {
        var urls = references.resolve(content, locale);
        var news =
                content instanceof HomeComposition home
                        ? references.news(home, locale)
                        : List.<SearchCatalog.Document>of();
        if (published && content instanceof NavigationMenu menu)
            content = references.visibleMenu(menu, urls);
        return new RenderView(
                locale,
                content,
                urls,
                news,
                references.educationDocuments(content, locale),
                content instanceof HomeComposition h
                        ? references.admissions(h, locale)
                        : List.of());
    }

    private View view(SiteDocument d) {
        return new View(
                d.id(),
                d.kind(),
                d.locale(),
                d.version(),
                d.draftVersion(),
                d.status(),
                d.draft(),
                d.updatedAt(),
                d.live() == null ? null : d.live().publishedAt());
    }
}
