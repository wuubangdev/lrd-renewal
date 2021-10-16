package vn.edu.ctu.lrd.site.domain;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;

import java.util.*;

public record NavigationMenu(List<Item> items) implements SiteContent {
    public record Item(UUID id, String label, SiteLink link, List<Item> children) {
        public Item {
            require(
                    id != null
                            && label != null
                            && label.length() <= 80
                            && link != null
                            && children != null,
                    "INVALID_MENU",
                    "Mục menu không hợp lệ.");
            label = label.strip();
            children = List.copyOf(children);
        }
    }

    public NavigationMenu {
        require(
                items != null && items.size() <= 8,
                "INVALID_MENU",
                "Menu có tối đa 8 mục cấp một.");
        items = List.copyOf(items);
        var ids = new HashSet<UUID>();
        for (var item : items) {
            require(
                    ids.add(item.id()) && item.children().size() <= 10,
                    "INVALID_MENU",
                    "Mã mục bị trùng hoặc quá 10 mục con.");
            for (var child : item.children())
                require(
                        ids.add(child.id()) && child.children().isEmpty(),
                        "INVALID_MENU",
                        "Menu chỉ hỗ trợ hai cấp và mã mục không trùng nhau.");
        }
        require(ids.size() <= 40, "INVALID_MENU", "Menu có tối đa 40 mục.");
    }

    public void validateForPublication() {
        require(!items.isEmpty(), "INVALID_MENU", "Menu cần ít nhất một mục.");
        for (var item : items) {
            validateItem(item);
            item.children().forEach(this::validateItem);
        }
    }

    private void validateItem(Item item) {
        require(!item.label().isBlank(), "INVALID_MENU", "Mỗi mục menu cần tên hiển thị.");
        require(
                item.link().kind() != SiteLink.Kind.GROUP || !item.children().isEmpty(),
                "INVALID_MENU",
                "Nhóm menu cần ít nhất một mục con.");
    }

    public List<SiteLink> links() {
        var result = new ArrayList<SiteLink>();
        items.forEach(
                i -> {
                    result.add(i.link());
                    i.children().forEach(c -> result.add(c.link()));
                });
        return List.copyOf(result);
    }

    public Set<UUID> assetIds() {
        return Set.of();
    }
}
