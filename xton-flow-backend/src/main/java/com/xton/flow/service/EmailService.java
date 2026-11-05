package com.xton.flow.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendVerificationEmail(String toEmail, String fullName, String token) {
        String link = baseUrl + "/api/auth/verify-email?token=" + token;
        String html = """
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#2563eb">Welcome to XtonFlow, %s!</h2>
              <p>Please verify your email address to activate your account.</p>
              <a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
                Verify Email
              </a>
              <p style="color:#6b7280;font-size:13px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
            </div>
            """.formatted(fullName, link);

        sendHtml(toEmail, "Verify your XtonFlow account", html);
    }

    public void sendInviteEmail(String toEmail, String inviterName, String orgName, String inviteLink) {
        String html = """
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#2563eb">You've been invited to join %s on XtonFlow</h2>
              <p><strong>%s</strong> has invited you to join their workspace.</p>
              <a href="%s" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
                Accept Invitation
              </a>
              <p style="color:#6b7280;font-size:13px">This invite link expires in 7 days.</p>
            </div>
            """.formatted(orgName, inviterName, inviteLink);

        sendHtml(toEmail, "You're invited to " + orgName + " on XtonFlow", html);
    }

    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }
}
