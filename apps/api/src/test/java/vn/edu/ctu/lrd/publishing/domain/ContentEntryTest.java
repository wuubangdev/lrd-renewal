package vn.edu.ctu.lrd.publishing.domain;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

class ContentEntryTest {
    private final Actor author =
            new Actor(UUID.randomUUID(), "Biên tập viên", Set.of("content:create"));
    private final Instant now = Instant.parse("2026-10-15T00:00:00Z");

    private ContentDraft draft(String title) {
        var text =
                new DocumentNode(
                        "text",
                        null,
                        "Nội dung đủ dài để đăng một bài viết học thuật.",
                        null,
                        null);
        var paragraph = new DocumentNode("paragraph", List.of(text), null, null, null);
        return new ContentDraft(
                title,
                "bai-viet-hoc-thuat",
                "",
                "TIN_TUC",
                new RichDocument(new DocumentNode("doc", List.of(paragraph), null, null, null)),
                null,
                "");
    }

    @Test
    void editingDraftDoesNotMutatePublicSnapshot() {
        var entry = ContentEntry.create(author, "vi", now);
        entry.revise(0, draft("Tiêu đề phiên bản đầu"), now);
        var publication = entry.publish(0, entry.draftVersion(), Set.of(), author, now);
        entry.revise(0, draft("Tiêu đề đang chỉnh sửa"), now.plusSeconds(10));
        assertThat(entry.status()).isEqualTo("CHANGED");
        assertThat(entry.live().snapshot().title()).isEqualTo("Tiêu đề phiên bản đầu");
        assertThat(entry.draft().title()).isEqualTo("Tiêu đề đang chỉnh sửa");
        assertThat(
                        entry.publish(
                                        0,
                                        entry.draftVersion(),
                                        Set.of(),
                                        author,
                                        now.plusSeconds(20))
                                .id())
                .isNotEqualTo(publication.id());
    }

    @Test
    void publicationRequiresContentAndExactDraftVersion() {
        var entry = ContentEntry.create(author, "vi", now);
        assertThatThrownBy(() -> entry.publish(0, 1, Set.of(), author, now))
                .isInstanceOf(DomainException.class);
        entry.revise(0, draft("Một bài viết hợp lệ"), now);
        assertThatThrownBy(() -> entry.publish(0, 1, Set.of(), author, now))
                .isInstanceOf(DomainException.class)
                .extracting(e -> ((DomainException) e).code())
                .isEqualTo("STALE_VERSION");
        assertThatThrownBy(() -> entry.revise(1, draft("Nội dung sửa đồng thời"), now))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void restoringAndWithdrawingPreserveHistorySnapshot() {
        var entry = ContentEntry.create(author, "vi", now);
        entry.revise(0, draft("Phiên bản thứ nhất"), now);
        var first = entry.publish(0, entry.draftVersion(), Set.of(), author, now);
        entry.revise(0, draft("Phiên bản thứ hai"), now);
        entry.publish(0, entry.draftVersion(), Set.of(), author, now);
        entry.restore(0, first, now);
        assertThat(entry.draft().title()).isEqualTo("Phiên bản thứ nhất");
        assertThat(entry.live().snapshot().title()).isEqualTo("Phiên bản thứ hai");
        entry.withdraw(0, now);
        assertThat(entry.status()).isEqualTo("DRAFT");
        assertThat(first.snapshot().title()).isEqualTo("Phiên bản thứ nhất");
    }

    @Test
    void imagesMustUseOwnedAssetReferencesAndSafeLinks() {
        var unsafe =
                new DocumentNode(
                        "text",
                        null,
                        "Liên kết",
                        null,
                        List.of(
                                new DocumentNode.Mark(
                                        "link", Map.of("href", "javascript:alert(1)"))));
        assertThatThrownBy(
                        () ->
                                new RichDocument(
                                        new DocumentNode("doc", List.of(unsafe), null, null, null)))
                .isInstanceOf(DomainException.class);
        var image =
                new DocumentNode(
                        "image",
                        null,
                        null,
                        Map.of(
                                "assetId",
                                UUID.randomUUID().toString(),
                                "alt",
                                "Ảnh",
                                "src",
                                "https://example.com/image"),
                        null);
        assertThatThrownBy(
                        () ->
                                new RichDocument(
                                        new DocumentNode("doc", List.of(image), null, null, null)))
                .isInstanceOf(DomainException.class);
        var valid = draft("Ảnh chưa sẵn sàng");
        var cover = UUID.randomUUID();
        var withCover =
                new ContentDraft(
                        valid.title(),
                        valid.slug(),
                        "",
                        valid.category(),
                        valid.document(),
                        cover,
                        "Ảnh minh họa");
        assertThatThrownBy(() -> withCover.validateForPublication(Set.of()))
                .isInstanceOf(DomainException.class);
        assertThatCode(() -> withCover.validateForPublication(Set.of(cover)))
                .doesNotThrowAnyException();
    }
}
