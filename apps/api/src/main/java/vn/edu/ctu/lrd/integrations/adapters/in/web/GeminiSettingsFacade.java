package vn.edu.ctu.lrd.integrations.adapters.in.web;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.ctu.lrd.integrations.application.GeminiSettingsService;
import vn.edu.ctu.lrd.sharedkernel.Actor;

@Service
@Transactional
public class GeminiSettingsFacade {
    private final GeminiSettingsService service;

    public GeminiSettingsFacade(GeminiSettingsService service) {
        this.service = service;
    }

    @Transactional(readOnly = true)
    public GeminiSettingsService.View view(Actor actor) {
        return service.view(actor);
    }

    public GeminiSettingsService.View save(Actor actor, String model, String apiKey) {
        return service.save(actor, model, apiKey);
    }

    public GeminiSettingsService.View removeKey(Actor actor) {
        return service.removeKey(actor);
    }

    @Transactional(readOnly = true)
    public void test(Actor actor, String model, String apiKey) {
        service.test(actor, model, apiKey);
    }
}
