package vn.edu.ctu.lrd.integrations.adapters.out.persistence;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.edu.ctu.lrd.sharedkernel.DomainException;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;

@Component
public class GeminiSecretCipher {
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public GeminiSecretCipher(@Value("${LRD_SETTINGS_ENCRYPTION_KEY:}") String override,
            @Value("${LRD_AUTH_PRIVATE_KEY}") String fallback) {
        try {
            String material = override == null || override.isBlank() ? fallback : override;
            if (material == null || material.length() < 32)
                throw new IllegalStateException("Settings encryption key is too short");
            var digest = MessageDigest.getInstance("SHA-256");
            digest.update("lrd-gemini-settings-v1:".getBytes(StandardCharsets.UTF_8));
            key = new SecretKeySpec(digest.digest(material.getBytes(StandardCharsets.UTF_8)), "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Cannot initialize settings encryption", e);
        }
    }

    public byte[] encrypt(String secret) {
        if (secret == null || secret.isBlank()) return null;
        try {
            var iv = new byte[12];
            random.nextBytes(iv);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            var encrypted = cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
            return ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
        } catch (Exception e) {
            throw new IllegalStateException("Cannot encrypt settings", e);
        }
    }

    public String decrypt(byte[] stored) {
        if (stored == null) return "";
        try {
            var input = ByteBuffer.wrap(stored);
            var iv = new byte[12];
            input.get(iv);
            var encrypted = new byte[input.remaining()];
            input.get(encrypted);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new DomainException("AI_SETTINGS_UNREADABLE", "Không thể đọc cấu hình Gemini. Kiểm tra khóa mã hóa của backend.");
        }
    }
}
