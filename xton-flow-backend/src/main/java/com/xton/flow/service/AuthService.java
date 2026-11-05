package com.xton.flow.service;

import com.xton.flow.dto.AuthRequestDto;
import com.xton.flow.dto.AuthResponseDto;
import com.xton.flow.dto.RegisterRequestDto;
import com.xton.flow.model.*;
import com.xton.flow.repository.*;
import com.xton.flow.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

        @Value("${app.auth.email-verification-required:true}")
        private boolean emailVerificationRequired;

    private final UserRepository userRepository;
    private final OrganisationRepository organisationRepository;
    private final OrganisationMemberRepository memberRepository;
    private final EmailVerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Transactional
    public String register(RegisterRequestDto request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .birthday(request.getBirthday())
                .gender(request.getGender())
                .emailVerified(!emailVerificationRequired)
                .build();
        userRepository.save(user);

        Organisation org;
        OrganisationMember.SystemRole systemRole;

        if (request.getOrgSlug() != null && !request.getOrgSlug().isBlank()) {
            // Joining existing org
            org = organisationRepository.findBySlug(request.getOrgSlug())
                    .orElseThrow(() -> new RuntimeException("Organisation not found"));
            systemRole = OrganisationMember.SystemRole.MEMBER;
        } else {
            // Creating new org
            String orgName = request.getOrgName() != null && !request.getOrgName().isBlank()
                    ? request.getOrgName()
                    : request.getFullName() + "'s Workspace";
            String slug = generateSlug(orgName);

            org = Organisation.builder()
                    .name(orgName)
                    .slug(slug)
                    .type(request.getWorkspaceType() != null ? request.getWorkspaceType() : Organisation.OrgType.PERSONAL)
                    .build();
            organisationRepository.save(org);
            systemRole = OrganisationMember.SystemRole.OWNER;
        }

        OrganisationMember member = OrganisationMember.builder()
                .user(user)
                .organisation(org)
                .systemRole(systemRole)
                .status(emailVerificationRequired
                        ? OrganisationMember.MemberStatus.PENDING
                        : OrganisationMember.MemberStatus.ACTIVE)
                .build();
        memberRepository.save(member);

        if (emailVerificationRequired) {
            sendVerificationEmail(user);
        }

        return emailVerificationRequired
                ? "Registration successful. Please check your email to verify your account."
                : "Registration successful. You can now sign in.";
    }

    @Transactional
    public void verifyEmail(String token) {
        EmailVerificationToken evt = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid verification token"));

        if (evt.getUsed()) throw new RuntimeException("Token already used");
        if (evt.getExpiresAt().isBefore(LocalDateTime.now())) throw new RuntimeException("Token expired");

        User user = evt.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        // Activate all pending memberships
        List<OrganisationMember> memberships = memberRepository.findByUserIdAndStatus(
                user.getId(), OrganisationMember.MemberStatus.PENDING);
        memberships.forEach(m -> m.setStatus(OrganisationMember.MemberStatus.ACTIVE));
        memberRepository.saveAll(memberships);

        evt.setUsed(true);
        tokenRepository.save(evt);
    }

    public AuthResponseDto login(AuthRequestDto request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

                if (!user.getEmailVerified() && !emailVerificationRequired) {
                        user.setEmailVerified(true);
                        userRepository.save(user);
                        memberRepository.findByUserIdAndStatus(user.getId(), OrganisationMember.MemberStatus.PENDING)
                                        .forEach(member -> member.setStatus(OrganisationMember.MemberStatus.ACTIVE));
                }

                if (!user.getEmailVerified()) {
            throw new RuntimeException("Please verify your email before logging in");
        }

        List<OrganisationMember> memberships = memberRepository.findByUserIdAndStatus(
                user.getId(), OrganisationMember.MemberStatus.ACTIVE);

        if (memberships.isEmpty()) {
            throw new RuntimeException("No active organisation membership found");
        }

        // Determine active org — use requested slug or default to first
        OrganisationMember activeMembership = memberships.stream()
                .filter(m -> request.getOrgSlug() != null &&
                        m.getOrganisation().getSlug().equals(request.getOrgSlug()))
                .findFirst()
                .orElse(memberships.get(0));

        String token = jwtUtil.generateToken(
                user.getEmail(),
                activeMembership.getSystemRole().name(),
                user.getTokenVersion(),
                activeMembership.getOrganisation().getId(),
                request.isRememberMe());

        List<AuthResponseDto.OrgContext> orgContexts = memberships.stream()
                .map(m -> AuthResponseDto.OrgContext.builder()
                        .orgId(m.getOrganisation().getId())
                        .orgName(m.getOrganisation().getName())
                        .orgSlug(m.getOrganisation().getSlug())
                        .systemRole(m.getSystemRole().name())
                        .customRole(m.getCustomRole())
                        .orgType(m.getOrganisation().getType().name())
                        .build())
                .collect(Collectors.toList());

        return AuthResponseDto.builder()
                .userId(user.getId())
                .token(token)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .expiresIn(request.isRememberMe() ? 2592000000L : 86400000L)
                .organisations(orgContexts)
                .activeOrgId(activeMembership.getOrganisation().getId())
                .build();
    }

    @Transactional
    public AuthResponseDto loginWithGoogle(OAuth2User principal) {
        String email = principal.getAttribute("email");
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Google did not provide an email address");
        }

        String subject = principal.getAttribute("sub");
        User user = userRepository.findByAuthProviderAndProviderSubject(User.AuthProvider.GOOGLE, subject)
                .orElseGet(() -> userRepository.findByEmail(email).orElse(null));

        if (user == null) {
            user = User.builder()
                    .email(email)
                    .fullName(principal.getAttribute("name") != null ? principal.getAttribute("name") : email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .emailVerified(true)
                    .authProvider(User.AuthProvider.GOOGLE)
                    .providerSubject(subject)
                    .build();
            userRepository.save(user);

            Organisation organisation = Organisation.builder()
                    .name(user.getFullName() + "'s Workspace")
                    .slug(generateSlug(user.getFullName() + "'s Workspace"))
                    .type(Organisation.OrgType.PERSONAL)
                    .build();
            organisationRepository.save(organisation);
            memberRepository.save(OrganisationMember.builder()
                    .user(user)
                    .organisation(organisation)
                    .systemRole(OrganisationMember.SystemRole.OWNER)
                    .status(OrganisationMember.MemberStatus.ACTIVE)
                    .build());
        } else {
            user.setEmailVerified(true);
            user.setAuthProvider(User.AuthProvider.GOOGLE);
            user.setProviderSubject(subject);
            userRepository.save(user);
        }

        OrganisationMember membership = memberRepository.findByUserIdAndStatus(
                        user.getId(), OrganisationMember.MemberStatus.ACTIVE)
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No active organisation membership found"));

        String token = jwtUtil.generateToken(
                user.getEmail(),
                membership.getSystemRole().name(),
                user.getTokenVersion(),
                membership.getOrganisation().getId(),
                true);

        List<AuthResponseDto.OrgContext> organisations = memberRepository.findByUserIdAndStatus(
                        user.getId(), OrganisationMember.MemberStatus.ACTIVE)
                .stream()
                .map(m -> AuthResponseDto.OrgContext.builder()
                        .orgId(m.getOrganisation().getId())
                        .orgName(m.getOrganisation().getName())
                        .orgSlug(m.getOrganisation().getSlug())
                        .systemRole(m.getSystemRole().name())
                        .customRole(m.getCustomRole())
                        .orgType(m.getOrganisation().getType().name())
                        .build())
                .collect(Collectors.toList());

        return AuthResponseDto.builder()
                .userId(user.getId())
                .token(token)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .expiresIn(2592000000L)
                .organisations(organisations)
                .activeOrgId(membership.getOrganisation().getId())
                .build();
    }

    public AuthResponseDto getSession(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        OrganisationMember membership = memberRepository.findByUserIdAndStatus(
                        user.getId(), OrganisationMember.MemberStatus.ACTIVE)
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No active organisation membership found"));

        List<AuthResponseDto.OrgContext> organisations = memberRepository.findByUserIdAndStatus(
                        user.getId(), OrganisationMember.MemberStatus.ACTIVE)
                .stream()
                .map(m -> AuthResponseDto.OrgContext.builder()
                        .orgId(m.getOrganisation().getId())
                        .orgName(m.getOrganisation().getName())
                        .orgSlug(m.getOrganisation().getSlug())
                        .systemRole(m.getSystemRole().name())
                        .customRole(m.getCustomRole())
                        .orgType(m.getOrganisation().getType().name())
                        .build())
                .collect(Collectors.toList());

        return AuthResponseDto.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .organisations(organisations)
                .activeOrgId(membership.getOrganisation().getId())
                .build();
    }

    public AuthResponseDto switchActiveOrganisation(String email, String orgId, boolean rememberMe) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OrganisationMember membership = memberRepository.findByUserIdAndOrganisationId(user.getId(), orgId)
                .orElseThrow(() -> new RuntimeException("You are not a member of that organisation"));

        if (membership.getStatus() != OrganisationMember.MemberStatus.ACTIVE) {
            throw new RuntimeException("This organisation membership is not active yet");
        }

        String token = jwtUtil.generateToken(
                user.getEmail(),
                membership.getSystemRole().name(),
                user.getTokenVersion(),
                membership.getOrganisation().getId(),
                rememberMe);

        List<OrganisationMember> memberships = memberRepository.findByUserIdAndStatus(
                user.getId(), OrganisationMember.MemberStatus.ACTIVE);

        List<AuthResponseDto.OrgContext> orgContexts = memberships.stream()
                .map(m -> AuthResponseDto.OrgContext.builder()
                        .orgId(m.getOrganisation().getId())
                        .orgName(m.getOrganisation().getName())
                        .orgSlug(m.getOrganisation().getSlug())
                        .systemRole(m.getSystemRole().name())
                        .customRole(m.getCustomRole())
                        .orgType(m.getOrganisation().getType().name())
                        .build())
                .collect(Collectors.toList());

        return AuthResponseDto.builder()
                .userId(user.getId())
                .token(token)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .expiresIn(rememberMe ? 2592000000L : 86400000L)
                .organisations(orgContexts)
                .activeOrgId(membership.getOrganisation().getId())
                .build();
    }

    public void logoutAllSessions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setTokenVersion(user.getTokenVersion() == null ? 1 : user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    private void sendVerificationEmail(User user) {
        tokenRepository.deleteByUserId(user.getId());
        String token = UUID.randomUUID().toString();
        EmailVerificationToken evt = EmailVerificationToken.builder()
                .token(token)
                .user(user)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        tokenRepository.save(evt);
        emailService.sendVerificationEmail(user.getEmail(), user.getFullName(), token);
    }

    private String generateSlug(String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String slug = base;
        int i = 1;
        while (organisationRepository.existsBySlug(slug)) {
            slug = base + "-" + i++;
        }
        return slug;
    }
}
