package vn.edu.ctu.lrd.identity.adapters.in.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/** An additional browser boundary; CSRF tokens are still required on every mutation. */
public final class AllowedOriginFilter extends OncePerRequestFilter {
    private final Set<String> origins;

    public AllowedOriginFilter(String configured) {
        origins =
                Arrays.stream(configured.split(","))
                        .map(String::strip)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        if (!Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod())
                && origin != null
                && !origins.contains(origin)) {
            response.setStatus(403);
            response.setContentType("application/problem+json;charset=UTF-8");
            response.getWriter()
                    .write(
                            "{\"status\":403,\"code\":\"ORIGIN_DENIED\",\"detail\":\"Nguồn gửi yêu"
                                    + " cầu không được cho phép.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
