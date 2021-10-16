package vn.edu.ctu.lrd.site.adapters;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import org.springframework.stereotype.Component;

import vn.edu.ctu.lrd.discovery.api.EducationCatalog;
import vn.edu.ctu.lrd.directory.api.DirectoryCatalog;
import vn.edu.ctu.lrd.discovery.api.SearchCatalog;
import vn.edu.ctu.lrd.media.api.MediaCatalog;
import vn.edu.ctu.lrd.platform.api.AuditLog;
import vn.edu.ctu.lrd.sharedkernel.CategoryCatalog;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.site.application.port.*;
import vn.edu.ctu.lrd.site.domain.*;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class SiteReferences implements SiteEffects {
    private final SearchCatalog search;
    private final MediaCatalog media;
    private final AuditLog audit;
    private final SiteRepository repository;
    private final EducationCatalog education;
    private final CategoryCatalog categories;
    private final DirectoryCatalog directory;
    private final java.time.Clock clock;

    public SiteReferences(
            SearchCatalog search,
            MediaCatalog media,
            AuditLog audit,
            SiteRepository repository,
            EducationCatalog education,
            CategoryCatalog categories,
            DirectoryCatalog directory,
            java.time.Clock clock) {
        this.search = search;
        this.media = media;
        this.audit = audit;
        this.repository = repository;
        this.education = education;
        this.categories = categories;
        this.directory = directory;
        this.clock = clock;
    }

    public void validateReferences(SiteDocument d, Actor actor) {
        media.requireUsable(d.draft().assetIds(), actor);
        for (var link : d.draft().links())
            if (link.kind() == SiteLink.Kind.CATEGORY)
                require(categories.exists(link.target()), "INVALID_REFERENCE", "Chuyên mục chưa tồn tại.");
        if (d.draft() instanceof HomeComposition h && !h.newsCategory().isBlank())
            require(categories.exists(h.newsCategory()), "INVALID_REFERENCE", "Chuyên mục tin chưa tồn tại.");
        var links = resolve(d.draft(), d.locale());
        for (var link : d.draft().links())
            require(
                    link.kind() == SiteLink.Kind.GROUP || links.containsKey(link.key()),
                    "INVALID_REFERENCE",
                    "Một liên kết trỏ đến nội dung hoặc khối trang chủ chưa công khai. Hãy kiểm tra"
                            + " lại.");
    }

    public void trackDraft(SiteDocument d, Actor actor) {
        media.requireUsable(d.draft().assetIds(), actor);
        media.replaceUsage(d.id(), d.draft().assetIds(), false);
    }

    public void trackPublication(SiteDocument d) {
        media.replaceUsage(d.id(), d.live().snapshot().assetIds(), true);
    }

    public void audit(Actor actor, String action, UUID id) {
        audit.record(actor.id(), action, id);
    }

    public Map<String, String> resolve(SiteContent content, String locale) {
        var ids =
                content.links().stream()
                        .filter(l -> l.kind() == SiteLink.Kind.ARTICLE)
                        .map(l -> UUID.fromString(l.target()))
                        .collect(Collectors.toSet());
        var articles =
                search.findPublished(locale, ids).stream()
                        .collect(
                                Collectors.toMap(
                                        SearchCatalog.Document::id, SearchCatalog.Document::slug));
        HomeComposition home =
                content instanceof HomeComposition h
                        ? h
                        : repository
                                .find(SiteDocument.Kind.HOME, locale)
                                .filter(d -> d.live() != null)
                                .map(d -> (HomeComposition) d.live().snapshot())
                                .orElse(null);
        var academic = educationDocuments(content, locale);
        var result = new LinkedHashMap<String, String>();
        for (var link : content.links()) {
            String url =
                    switch (link.kind()) {
                        case HOME -> home == null ? null : "/" + locale;
                        case NEWS -> "/" + locale + "/tin-tuc";
                        case EVENTS -> "/" + locale + "/hoi-thao";
                        case JOBS -> "/" + locale + "/tuyen-dung";
                        case RESEARCH -> "/" + locale + "/nghien-cuu";
                        case PROJECTS -> "/" + locale + "/nghien-cuu/de-tai";
                        case PUBLICATIONS -> "/" + locale + "/nghien-cuu/cong-bo";
                        case TEXTBOOKS -> "/" + locale + "/nghien-cuu/giao-trinh";
                        case DOCUMENTS -> "/" + locale + "/nghien-cuu/tai-lieu";
                        case PEOPLE -> "/" + locale + "/can-bo";
                        case LABS -> "/" + locale + "/phong-thi-nghiem";
                        case LABORATORY -> directory.publishedLaboratorySlug(locale, UUID.fromString(link.target()))
                                .map(slug -> "/" + locale + "/phong-thi-nghiem/" + slug).orElse(null);
                        case ANCHOR ->
                                home != null && home.hasAnchor(link.target())
                                        ? "/" + locale + "#" + link.target()
                                        : null;
                        case CATEGORY -> "/" + locale + "/tin-tuc?category=" + link.target();
                        case ARTICLE ->
                                articles.containsKey(UUID.fromString(link.target()))
                                        ? "/"
                                                + locale
                                                + "/tin-tuc/"
                                                + articles.get(UUID.fromString(link.target()))
                                        : null;
                        case PROGRAMS -> "/" + locale + "/dao-tao";
                        case ADMISSIONS -> "/" + locale + "/tuyen-sinh";
                        case PROGRAM, ADMISSION ->
                                academic.containsKey(link.target())
                                        ? "/"
                                                + locale
                                                + (link.kind() == SiteLink.Kind.PROGRAM
                                                        ? "/dao-tao/"
                                                        : "/tuyen-sinh/")
                                                + academic.get(link.target()).slug()
                                        : null;
                        case EXTERNAL -> link.target();
                        case GROUP -> null;
                    };
            if (url != null) result.put(link.key(), url);
        }
        return result;
    }

    public Map<String, EducationCatalog.Document> educationDocuments(
            SiteContent content, String locale) {
        var result = new LinkedHashMap<String, EducationCatalog.Document>();
        for (var kind : List.of(SiteLink.Kind.PROGRAM, SiteLink.Kind.ADMISSION)) {
            var ids =
                    content.links().stream()
                            .filter(l -> l.kind() == kind)
                            .map(l -> UUID.fromString(l.target()))
                            .collect(Collectors.toSet());
            education
                    .findPublished(locale, kind.name(), ids)
                    .forEach(d -> result.put(d.id().toString(), d));
        }
        return result;
    }

    public List<EducationCatalog.Document> admissions(HomeComposition h, String locale) {
        return h.sections().contains(HomeComposition.Section.ADMISSIONS)
                ? education
                        .search(
                                locale,
                                "ADMISSION",
                                "",
                                "",
                                h.admissionsMode() == HomeComposition.AdmissionsMode.OPEN
                                        ? "OPEN"
                                        : "",
                                null,
                                null,
                                0,
                                6,
                                clock.instant())
                        .items()
                : List.of();
    }

    public List<SearchCatalog.Document> news(HomeComposition h, String locale) {
        if (!h.sections().contains(HomeComposition.Section.NEWS)) return List.of();
        var featured =
                search.findPublished(locale, new HashSet<>(h.featuredIds())).stream()
                        .collect(Collectors.toMap(SearchCatalog.Document::id, d -> d));
        var items = new LinkedHashMap<UUID, SearchCatalog.Document>();
        h.featuredIds()
                .forEach(
                        id -> {
                            if (featured.containsKey(id)) items.put(id, featured.get(id));
                        });
        search.search(locale, "", h.newsCategory(), 0, h.newsLimit())
                .items()
                .forEach(d -> items.putIfAbsent(d.id(), d));
        return items.values().stream().limit(h.newsLimit()).toList();
    }

    public NavigationMenu visibleMenu(NavigationMenu menu, Map<String, String> urls) {
        var items = new ArrayList<NavigationMenu.Item>();
        for (var item : menu.items()) {
            var children =
                    item.children().stream().filter(c -> urls.containsKey(c.link().key())).toList();
            boolean visible = urls.containsKey(item.link().key());
            if (visible || !children.isEmpty())
                items.add(
                        new NavigationMenu.Item(
                                item.id(),
                                item.label(),
                                visible ? item.link() : new SiteLink(SiteLink.Kind.GROUP, ""),
                                children));
        }
        return new NavigationMenu(items);
    }
}
