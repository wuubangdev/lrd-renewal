package vn.edu.ctu.lrd.localization.adapters.out;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import java.util.*;
import vn.edu.ctu.lrd.localization.application.port.*;
import vn.edu.ctu.lrd.localization.domain.*;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

@Repository
public class TranslationPersistence implements TranslationResources, TranslationLinks {
    private final JdbcClient jdbc;
    public TranslationPersistence(JdbcClient jdbc) { this.jdbc = jdbc; }

    public Optional<TranslationResource> resource(TranslationKind kind, UUID id) {
        kind.requireLinkable();
        String table = switch (kind) {
            case ARTICLE -> "publishing.content_entry";
            case STAFF -> "directory.staff_profile";
            case LABORATORY -> "directory.laboratory_profile";
            case PROGRAM -> "academics.program";
            case ADMISSION -> "academics.admission";
            case EDITORIAL -> "editorial.item";
            case RESEARCH -> "research.record";
            default -> throw new IllegalArgumentException("Not a linked resource");
        };
        String subtype = switch (kind) {
            case PROGRAM, ADMISSION -> "level";
            case EDITORIAL, RESEARCH -> "kind";
            default -> "''";
        };
        String owner = kind == TranslationKind.ARTICLE ? "owner_id" : "null::uuid";
        return jdbc.sql("select id,locale," + subtype + " as subtype," + owner + " as owner_id from " + table + " where id=:id")
                .param("id", id).query((rs, row) -> new TranslationResource(rs.getObject("id", UUID.class),
                        rs.getString("locale"), rs.getString("subtype"), rs.getObject("owner_id", UUID.class))).optional();
    }
    public Optional<TranslationLink> find(TranslationKind kind, UUID sourceId) {
        return jdbc.sql("select target_id from platform.translation_link where source_kind=:kind and source_id=:id")
                .param("kind", kind.name()).param("id", sourceId).query(UUID.class).optional()
                .map(target -> new TranslationLink(kind, sourceId, target));
    }
    public void insert(TranslationLink link) {
        jdbc.sql("insert into platform.translation_link(source_kind,source_id,target_id) values(:kind,:source,:target) on conflict do nothing")
                .param("kind", link.kind().name()).param("source", link.sourceId()).param("target", link.targetId()).update();
        DomainException.require(find(link.kind(), link.sourceId()).filter(link::equals).isPresent(),
                "TRANSLATION_EXISTS", "Nguồn hoặc bản tiếng Anh đã có liên kết khác.");
    }
}
