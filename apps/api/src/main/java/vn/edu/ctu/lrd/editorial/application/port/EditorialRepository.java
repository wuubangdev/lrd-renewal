package vn.edu.ctu.lrd.editorial.application.port;

import vn.edu.ctu.lrd.editorial.domain.*;
import java.util.*;

public interface EditorialRepository {
    EditorialItem get(UUID id);
    List<EditorialItem> list(EditorialKind kind, String locale, boolean publicOnly);
    Optional<EditorialItem> published(EditorialKind kind, String locale, String slug);
    boolean slugTaken(EditorialKind kind, String locale, String slug, UUID except);
    boolean articleTaken(UUID articleId, UUID except);
    void insert(EditorialItem item);
    void save(EditorialItem item, long expectedVersion);
}
