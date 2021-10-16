package vn.edu.ctu.lrd.media.adapters.out.persistence;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import vn.edu.ctu.lrd.media.application.port.AssetRepository;
import vn.edu.ctu.lrd.media.domain.MediaAsset;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Repository
public class AssetPersistence implements AssetRepository {
    private final JdbcClient jdbc;

    public AssetPersistence(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(MediaAsset a) {
        jdbc.sql(
                        "insert into"
                            + " media.asset(id,owner_id,original_name,object_key,content_type,byte_size,width,height,status,created_at)"
                            + " values(:id,:owner,:name,:key,:type,:size,:width,:height,:status,:at)")
                .param("id", a.id())
                .param("owner", a.ownerId())
                .param("name", a.name())
                .param("key", a.objectKey())
                .param("type", a.contentType())
                .param("size", a.size())
                .param("width", a.width())
                .param("height", a.height())
                .param("status", a.status())
                .param("at", java.sql.Timestamp.from(a.createdAt()))
                .update();
    }

    public MediaAsset get(UUID id) {
        return jdbc.sql("select * from media.asset where id=:id")
                .param("id", id)
                .query(this::map)
                .optional()
                .orElseThrow(() -> new DomainException("NOT_FOUND", "Không tìm thấy ảnh."));
    }

    public List<MediaAsset> list(UUID owner, int page, int size, String query) {
        var sql =
                jdbc.sql(
                                "select * from media.asset "
                                        + "where original_name ilike :query escape '!' "
                                        + (owner == null ? "" : "and owner_id=:owner ")
                                        + "order by created_at desc,id limit :size offset :offset")
                        .param(
                                "query",
                                "%"
                                        + query.replace("!", "!!")
                                                .replace("%", "!%")
                                                .replace("_", "!_")
                                        + "%")
                        .param("size", size)
                        .param("offset", page * size);
        if (owner != null) sql.param("owner", owner);
        return sql.query(this::map).list();
    }

    public boolean isPublic(UUID id) {
        return jdbc.sql(
                        "select exists(select 1 from media.asset_usage where asset_id=:id and"
                                + " published)")
                .param("id", id)
                .query(Boolean.class)
                .single();
    }

    public void replaceUsage(UUID source, Set<UUID> ids, boolean published) {
        jdbc.sql("delete from media.asset_usage where source_id=:source and published=:published")
                .param("source", source)
                .param("published", published)
                .update();
        for (var id : ids)
            jdbc.sql(
                            "insert into media.asset_usage(source_id,asset_id,published)"
                                    + " values(:source,:asset,:published)")
                    .param("source", source)
                    .param("asset", id)
                    .param("published", published)
                    .update();
    }

    private MediaAsset map(ResultSet r, int n) throws SQLException {
        return new MediaAsset(
                r.getObject("id", UUID.class),
                r.getObject("owner_id", UUID.class),
                r.getString("original_name"),
                r.getString("object_key"),
                r.getString("content_type"),
                r.getLong("byte_size"),
                r.getInt("width"),
                r.getInt("height"),
                r.getString("status"),
                r.getTimestamp("created_at").toInstant());
    }
}
