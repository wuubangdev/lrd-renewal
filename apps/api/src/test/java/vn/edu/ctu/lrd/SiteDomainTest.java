package vn.edu.ctu.lrd;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

import vn.edu.ctu.lrd.sharedkernel.DomainException;
import vn.edu.ctu.lrd.site.domain.*;

import java.time.Instant;
import java.util.*;

class SiteDomainTest {
    NavigationMenu.Item item(String label, List<NavigationMenu.Item> children) {
        return new NavigationMenu.Item(
                UUID.randomUUID(), label, new SiteLink(SiteLink.Kind.NEWS, ""), children);
    }

    @Test
    void menuRejectsThreeLevelsDuplicateIdsEmptyGroupsAndUnsafeUrls() {
        var leaf = item("Tin", List.of());
        assertThatThrownBy(
                        () ->
                                new NavigationMenu(
                                        List.of(
                                                item(
                                                        "Root",
                                                        List.of(item("Middle", List.of(leaf)))))))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> new NavigationMenu(List.of(leaf, leaf)))
                .isInstanceOf(DomainException.class);
        var group =
                new NavigationMenu(
                        List.of(
                                new NavigationMenu.Item(
                                        UUID.randomUUID(),
                                        "Nhóm",
                                        new SiteLink(SiteLink.Kind.GROUP, ""),
                                        List.of())));
        assertThatThrownBy(group::validateForPublication).isInstanceOf(DomainException.class);
        for (String url :
                List.of(
                        "javascript:alert(1)",
                        "http://insecure.test",
                        "https://user:pass@test.invalid",
                        "/admin/users",
                        "https://good.test\\@bad.test"))
            assertThatThrownBy(() -> new SiteLink(SiteLink.Kind.EXTERNAL, url))
                    .isInstanceOf(DomainException.class);
        assertThatCode(() -> new SiteLink(SiteLink.Kind.EXTERNAL, "https://ctu.edu.vn/"))
                .doesNotThrowAnyException();
    }

    @Test
    void draftEditsAndRestorationDoNotChangePublishedNavigation() {
        var menu = new NavigationMenu(List.of(item("Bản đầu", List.of())));
        var d =
                new SiteDocument(
                        UUID.randomUUID(),
                        SiteDocument.Kind.MENU,
                        "vi",
                        menu,
                        1,
                        0,
                        null,
                        Instant.now());
        var published = d.publish(0, 1, UUID.randomUUID(), Instant.now());
        var revised =
                published.revise(
                        new NavigationMenu(List.of(item("Nháp mới", List.of()))),
                        published.version(),
                        Instant.now());
        assertThat(((NavigationMenu) revised.live().snapshot()).items().getFirst().label())
                .isEqualTo("Bản đầu");
        assertThat(revised.status()).isEqualTo("CHANGED");
        assertThatThrownBy(
                        () ->
                                revised.publish(
                                        published.version(),
                                        revised.draftVersion(),
                                        UUID.randomUUID(),
                                        Instant.now()))
                .isInstanceOf(DomainException.class);
        var restored = revised.restore(published.live(), revised.version(), Instant.now());
        assertThat(restored.draftVersion()).isEqualTo(3);
        assertThat(restored.live()).isEqualTo(published.live());
    }
}
