package com.xton.flow.config;

import com.xton.flow.dto.AuthResponseDto;
import com.xton.flow.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final JwtCookieUtil jwtCookieUtil;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)
                || !"google".equals(oauthToken.getAuthorizedClientRegistrationId())) {
            response.sendRedirect("http://localhost:5173/login?oauth2Error=true");
            return;
        }

        AuthResponseDto auth = authService.loginWithGoogle(oauthToken.getPrincipal());
        jwtCookieUtil.addJwtCookie(response, auth.getToken(), true);
        response.sendRedirect("http://localhost:5173/dashboard");
    }
}
