package vn.edu.ctu.lrd.publishing.adapters.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.publishing.application.CategoryService;
import vn.edu.ctu.lrd.publishing.domain.ArticleCategory;
import java.util.List;

@RestController
@Transactional
public class CategoryController {
    private final CategoryService service;
    private final ActorResolver actors;
    public CategoryController(CategoryService service, ActorResolver actors) {
        this.service = service; this.actors = actors;
    }

    @GetMapping("/api/v1/public/categories")
    @Transactional(readOnly = true)
    public List<ArticleCategory> list() { return service.list(); }

    @PostMapping("/api/v1/admin/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ArticleCategory create(@RequestBody ArticleCategory category) {
        return service.create(actors.current(), category);
    }

    @PutMapping("/api/v1/admin/categories/{code}")
    public ArticleCategory update(@PathVariable String code, @RequestBody CategoryValues values) {
        return service.update(actors.current(), new ArticleCategory(code, values.nameVi(), values.nameEn(), values.sortOrder()));
    }

    @DeleteMapping("/api/v1/admin/categories/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String code) { service.delete(actors.current(), code); }

    public record CategoryValues(String nameVi, String nameEn, int sortOrder) {}
}
