package com.xton.flow.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration:86400000}")
    private Long expiration;

    @Value("${jwt.remember-expiration:2592000000}")
    private Long rememberExpiration;

    private SecretKey getSigningKey() {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 characters long");
        }
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(String username, String role, Integer tokenVersion, String orgId, boolean rememberMe) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("tokenVersion", tokenVersion != null ? tokenVersion : 0);
        claims.put("orgId", orgId);
        return createToken(claims, username, rememberMe ? rememberExpiration : expiration);
    }

    public String extractOrgId(String token) {
        return extractClaim(token, claims -> claims.get("orgId", String.class));
    }

    public Integer extractTokenVersion(String token) {
        Number version = extractClaim(token, claims -> claims.get("tokenVersion", Number.class));
        return version != null ? version.intValue() : 0;
    }

    private String createToken(Map<String, Object> claims, String subject, Long tokenLifetimeMillis) {
        Date now = new Date();
        Date expirationDate = new Date(now.getTime() + tokenLifetimeMillis);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(now)
                .expiration(expirationDate)
                .signWith(getSigningKey())
                .compact();
    }

    public Boolean validateToken(String token, String username, Integer tokenVersion) {
        final String extractedUsername = extractUsername(token);
        final Integer extractedTokenVersion = extractTokenVersion(token);
        final int currentVersion = tokenVersion != null ? tokenVersion : 0;

        return (extractedUsername.equals(username)
                && extractedTokenVersion == currentVersion
                && !isTokenExpired(token));
    }
}