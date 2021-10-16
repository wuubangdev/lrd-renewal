package vn.edu.ctu.lrd.academics.application.port;

import vn.edu.ctu.lrd.academics.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.util.UUID;

public interface AcademicEffects {
    void validateAssets(java.util.Set<UUID> assets, Actor actor);

    void synchronize(AcademicProgram program);

    void synchronize(AdmissionCampaign admission);

    void audit(Actor actor, String action, UUID id, String reason);
}
