package vn.edu.ctu.lrd.integrations.adapters.out.persistence;

import org.junit.jupiter.api.Test;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

class GeminiSecretCipherTest {
    @Test
    void encryptsWithFreshNonceAndRejectsWrongKey() {
        var cipher = new GeminiSecretCipher("", "test-private-material-long-enough-for-derivation");
        var first = cipher.encrypt("secret-gemini-key");
        var second = cipher.encrypt("secret-gemini-key");
        assertFalse(Arrays.equals(first, second));
        assertFalse(new String(first, StandardCharsets.ISO_8859_1).contains("secret-gemini-key"));
        assertEquals("secret-gemini-key", cipher.decrypt(first));
        assertThrows(DomainException.class, () ->
                new GeminiSecretCipher("another-secret-material-long-enough", "fallback-material-long-enough").decrypt(first));
    }
}
