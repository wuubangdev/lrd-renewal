package vn.edu.ctu.lrd.publishing.application.port;

import vn.edu.ctu.lrd.sharedkernel.CategoryCatalog;
import vn.edu.ctu.lrd.publishing.domain.ArticleCategory;
import java.util.List;

public interface CategoryRepository extends CategoryCatalog {
    List<ArticleCategory> list();
    void insert(ArticleCategory category);
    void update(ArticleCategory category);
    void delete(String code);
    boolean inUse(String code);
}
