package vn.edu.ctu.lrd.publishing.application;

import static vn.edu.ctu.lrd.sharedkernel.DomainException.require;
import vn.edu.ctu.lrd.publishing.application.port.CategoryRepository;
import vn.edu.ctu.lrd.publishing.domain.ArticleCategory;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import java.util.List;

public final class CategoryService {
    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) { this.repository = repository; }

    public List<ArticleCategory> list() { return repository.list(); }

    public ArticleCategory create(Actor actor, ArticleCategory category) {
        actor.require("site:manage");
        require(!repository.exists(category.code()), "DUPLICATE_CATEGORY", "Mã chuyên mục đã tồn tại.");
        repository.insert(category);
        return category;
    }

    public ArticleCategory update(Actor actor, ArticleCategory category) {
        actor.require("site:manage");
        require(repository.exists(category.code()), "NOT_FOUND", "Không tìm thấy chuyên mục.");
        repository.update(category);
        return category;
    }

    public void delete(Actor actor, String code) {
        actor.require("site:manage");
        require(repository.exists(code), "NOT_FOUND", "Không tìm thấy chuyên mục.");
        require(!repository.inUse(code), "CATEGORY_IN_USE",
                "Chuyên mục đang được dùng trong bài viết hoặc website. Hãy chuyển nội dung trước khi xóa.");
        repository.delete(code);
    }
}
