package vn.edu.ctu.lrd.identity.adapters.in.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import vn.edu.ctu.lrd.identity.api.ActorResolver;
import vn.edu.ctu.lrd.sharedkernel.Actor;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

@Component
public class CurrentActor implements ActorResolver {
    public Actor current() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof CmsPrincipal p))
            throw new DomainException("UNAUTHORIZED", "Vui lòng đăng nhập.");
        return new Actor(p.id, p.name, p.permissions);
    }
}
