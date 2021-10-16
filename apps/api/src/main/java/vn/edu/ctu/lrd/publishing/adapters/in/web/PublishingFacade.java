package vn.edu.ctu.lrd.publishing.adapters.in.web;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.publishing.application.PublishingService;
import vn.edu.ctu.lrd.publishing.application.DocxImportService;
import vn.edu.ctu.lrd.publishing.application.port.DocxReader;
import vn.edu.ctu.lrd.publishing.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PublishingFacade {
    private final PublishingService service;
    private final DocxImportService docxImport;

    public PublishingFacade(PublishingService service, DocxImportService docxImport) {
        this.service = service;
        this.docxImport = docxImport;
    }

    public ContentEntry create(Actor actor, String locale) {
        return service.create(actor, locale);
    }

    @Transactional(readOnly = true)
    public ContentEntry get(Actor actor, UUID id) {
        return service.get(actor, id);
    }

    @Transactional(readOnly = true)
    public ContentEntry publicEntry(UUID id) {
        return service.publicEntry(id);
    }

    @Transactional(readOnly = true)
    public PublishingService.Page list(Actor actor, int page, int size, String query, String category, String status) {
        return service.list(actor, page, size, query, category, status);
    }

    public ContentEntry save(Actor actor, UUID id, long version, ContentDraft draft) {
        return service.save(actor, id, version, draft);
    }

    public DocxReader.Imported importDocx(Actor actor, UUID id, String filename, byte[] bytes, boolean enhance) {
        return docxImport.importFile(actor, id, filename, bytes, enhance);
    }

    public boolean aiImportAvailable() {
        return docxImport.aiAvailable();
    }

    public ContentEntry publish(Actor actor, UUID id, long version, long draftVersion, String key) {
        return service.publish(actor, id, version, draftVersion, key);
    }

    public ContentEntry withdraw(Actor actor, UUID id, long version) {
        return service.withdraw(actor, id, version);
    }

    @Transactional(readOnly = true)
    public List<Publication> revisions(Actor actor, UUID id) {
        return service.revisions(actor, id);
    }

    public ContentEntry restore(Actor actor, UUID id, long version, UUID revisionId) {
        return service.restore(actor, id, version, revisionId);
    }
}
