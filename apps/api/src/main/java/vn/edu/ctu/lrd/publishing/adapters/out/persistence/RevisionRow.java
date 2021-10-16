package vn.edu.ctu.lrd.publishing.adapters.out.persistence;

import jakarta.persistence.*;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "content_revision", schema = "publishing")
public class RevisionRow {
    @Id UUID id;

    @Column(nullable = false)
    UUID entryId;

    @Column(nullable = false)
    long draftVersion;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    String snapshotJson;

    @Column(nullable = false)
    Instant publishedAt;

    @Column(nullable = false)
    UUID publishedBy;

    @Column(nullable = false, length = 120)
    String authorName;

    protected RevisionRow() {}
}
