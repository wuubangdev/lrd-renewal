package vn.edu.ctu.lrd.identity.adapters.in.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

@Component
public class RouteHints {
    private final JwtEncoder encoder;
    private final Clock clock;
    private final boolean secure;

    public RouteHints(
            @Value("${lrd.auth.private-key}") String privateKey,
            @Value("${lrd.auth.public-key}") String publicKey,
            @Value("${lrd.auth.cookie-secure}") boolean secure,
            Clock clock)
            throws Exception {
        var factory = KeyFactory.getInstance("RSA");
        var pub =
                (RSAPublicKey)
                        factory.generatePublic(
                                new X509EncodedKeySpec(Base64.getDecoder().decode(publicKey)));
        var priv =
                (RSAPrivateKey)
                        factory.generatePrivate(
                                new PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateKey)));
        encoder =
                new NimbusJwtEncoder(
                        new ImmutableJWKSet<>(
                                new JWKSet(
                                        new RSAKey.Builder(pub)
                                                .privateKey(priv)
                                                .keyID("lrd-1")
                                                .build())));
        this.clock = clock;
        this.secure = secure;
    }

    public void issue(CmsPrincipal principal, HttpServletResponse response) {
        var now = clock.instant();
        var claims =
                JwtClaimsSet.builder()
                        .issuer("lrd-api")
                        .audience(List.of("lrd-web"))
                        .subject(principal.id.toString())
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(300))
                        .claim("permissions", principal.permissions)
                        .claim("authVersion", principal.authVersion)
                        .build();
        var token =
                encoder.encode(
                                JwtEncoderParameters.from(
                                        JwsHeader.with(SignatureAlgorithm.RS256).build(), claims))
                        .getTokenValue();
        response.addHeader("Set-Cookie", cookie(token, Duration.ofMinutes(5)).toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader("Set-Cookie", cookie("", Duration.ZERO).toString());
    }

    private ResponseCookie cookie(String value, Duration age) {
        return ResponseCookie.from("LRD_ROUTE", value)
                .path("/")
                .sameSite("Lax")
                .secure(secure)
                .httpOnly(true)
                .maxAge(age)
                .build();
    }
}
