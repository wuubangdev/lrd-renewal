package vn.edu.ctu.lrd.identity.adapters.in.web;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.edu.ctu.lrd.identity.application.IdentityService;
import vn.edu.ctu.lrd.identity.application.port.*;
import vn.edu.ctu.lrd.identity.domain.*;
import vn.edu.ctu.lrd.sharedkernel.Actor;

import java.time.Clock;
import java.util.UUID;

@Service
@Transactional
public class IdentityFacade {
    private final IdentityService service;

    public IdentityFacade(IdentityStore store, IdentityEffects effects) {
        service = new IdentityService(store, effects, Clock.systemUTC());
    }

    @Transactional(readOnly = true)
    public IdentityStore.Accounts list(Actor actor, String query, int page, int size) {
        return service.list(actor, query, page, size);
    }

    public IdentityService.Invitation invite(Actor actor, String email, String name, Role role) {
        return service.invite(actor, email, name, role);
    }

    public Account update(
            Actor actor,
            UUID id,
            String email,
            String name,
            Role role,
            boolean active,
            long version) {
        return service.update(actor, id, email, name, role, active, version);
    }

    public Account revoke(Actor actor, UUID id, long version) {
        return service.revoke(actor, id, version);
    }

    public IdentityService.ResetLink resetLink(Actor actor, UUID id, long version) {
        return service.resetLink(actor, id, version);
    }

    public void changePassword(Actor actor, String current, String password) {
        service.changePassword(actor, current, password);
    }

    public void resetPassword(String token, String password) {
        service.resetPassword(token, password);
    }
}
