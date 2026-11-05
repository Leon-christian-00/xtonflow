package com.xton.flow.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AuthRequestDto {

    @NotBlank @Email
    private String email;

    @NotBlank
    private String password;

    private boolean rememberMe;

    // optional — if user belongs to multiple orgs, specify which one to log into
    private String orgSlug;
}
