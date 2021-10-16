package vn.edu.ctu.lrd.publishing.adapters.out.persistence;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import vn.edu.ctu.lrd.publishing.application.port.CategoryRepository;
import vn.edu.ctu.lrd.publishing.domain.ArticleCategory;
import java.util.List;

@Repository
public class CategoryPersistence implements CategoryRepository {
    private final JdbcClient jdbc;
    public CategoryPersistence(JdbcClient jdbc) { this.jdbc = jdbc; }

    public List<ArticleCategory> list() {
        return jdbc.sql("select code,name_vi,name_en,sort_order from publishing.category order by sort_order,code")
                .query((r, n) -> new ArticleCategory(r.getString("code"), r.getString("name_vi"),
                        r.getString("name_en"), r.getInt("sort_order"))).list();
    }

    public boolean exists(String code) {
        return jdbc.sql("select count(*) from publishing.category where code=:code")
                .param("code", code).query(Integer.class).single() > 0;
    }

    public void insert(ArticleCategory c) {
        jdbc.sql("insert into publishing.category(code,name_vi,name_en,sort_order) values(:code,:vi,:en,:order)")
                .param("code", c.code()).param("vi", c.nameVi()).param("en", c.nameEn())
                .param("order", c.sortOrder()).update();
    }

    public void update(ArticleCategory c) {
        jdbc.sql("update publishing.category set name_vi=:vi,name_en=:en,sort_order=:order where code=:code")
                .param("code", c.code()).param("vi", c.nameVi()).param("en", c.nameEn())
                .param("order", c.sortOrder()).update();
    }

    public void delete(String code) {
        jdbc.sql("delete from publishing.category where code=:code").param("code", code).update();
    }

    public boolean inUse(String code) {
        var count = jdbc.sql("""
                select (select count(*) from publishing.content_entry where draft_json->>'category'=:code)
                     + (select count(*) from publishing.content_revision where snapshot_json->>'category'=:code)
                     + (select count(*) from discovery.search_document where category=:code)
                """).param("code", code).query(Long.class).single();
        if (count > 0) return true;
        var literal = "%\"" + code + "\"%";
        return jdbc.sql("""
                select (select count(*) from site.managed_document where draft::text like :value)
                     + (select count(*) from site.document_release where snapshot::text like :value)
                """).param("value", literal).query(Long.class).single() > 0;
    }
}
