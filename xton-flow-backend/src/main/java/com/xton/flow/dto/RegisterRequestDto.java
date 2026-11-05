package com.xton.flow.dto;

import com.xton.flow.model.Organisation;
import com.xton.flow.model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class RegisterRequestDto {

    @NotBlank
    private String fullName;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 6)
    private String password;

    private LocalDate birthday;
    private User.Gender gender;

    // PERSONAL or TEAM
    private Organisation.OrgType workspaceType;

    // If creating a new org
    private String orgName;

    // If joining existing org
    private String orgSlug;
}
