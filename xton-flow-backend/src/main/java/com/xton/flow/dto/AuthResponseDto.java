package com.xton.flow.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AuthResponseDto {
    private String userId;
    private String token;
    private String email;
    private String fullName;
    private Long expiresIn;
    private List<OrgContext> organisations;
    private String activeOrgId;

    @Data
    @Builder
    public static class OrgContext {
        private String orgId;
        private String orgName;
        private String orgSlug;
        private String systemRole;
        private String customRole;
        private String orgType;
    }
}
