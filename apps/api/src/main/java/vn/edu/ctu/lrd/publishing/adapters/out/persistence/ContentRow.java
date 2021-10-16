package vn.edu.ctu.lrd.publishing.adapters.out.persistence;

import jakarta.persistence.*;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "content_entry", schema = "publishing")
public class ContentRow {
    @Id UUID id;

    @Column(nullable = false)
    UUID ownerId;

    @Column(nullable = false, length = 5)
    String locale;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    String draftJson;

    @Column(nullable = false)
    long draftVersion;

    UUID liveRevisionId;
    @Version Long version;

    @Column(nullable = false)
    Instant createdAt;

    @Column(nullable = false)
    Instant updatedAt;

    protected ContentRow() {}
}
