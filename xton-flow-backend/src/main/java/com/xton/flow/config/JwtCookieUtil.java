package com.xton.flow.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

@Component
public class JwtCookieUtil {

    private static final String COOKIE_NAME = "jwt";
    private static final String COOKIE_PATH = "/";
    private static final String COOKIE_DOMAIN = "localhost";
    private static final String COOKIE_SAME_SITE = "Lax";

    public void addJwtCookie(HttpServletResponse response, String token, boolean rememberMe) {
        StringBuilder cookieValue = new StringBuilder()
                .append(COOKIE_NAME).append("=").append(token)
                .append("; HttpOnly")
                .append("; Path=").append(COOKIE_PATH)
                .append("; SameSite=").append(COOKIE_SAME_SITE);

        if (rememberMe) {
            long maxAge = 30L * 24 * 60 * 60;
            cookieValue.append("; Max-Age=").append(maxAge);
        }

        response.addHeader("Set-Cookie", cookieValue.toString());
    }

    public void clearJwtCookie(HttpServletResponse response) {
        String cookieValue = COOKIE_NAME + "=; HttpOnly; Path=" + COOKIE_PATH + "; Max-Age=0; SameSite=" + COOKIE_SAME_SITE;
        response.addHeader("Set-Cookie", cookieValue);
    }
}
