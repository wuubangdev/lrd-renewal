package vn.edu.ctu.lrd.publishing.application.port;

import vn.edu.ctu.lrd.publishing.domain.DocumentNode;

import java.util.List;

/** Produces an editorial outline; the source document remains authoritative. */
public interface ArticleComposer {
    record Section(int beforeIndex, String heading) {}
    record Composition(String title, String summary, List<Section> sections) {}

    boolean available();

    Composition compose(String title, DocumentNode source);
}
