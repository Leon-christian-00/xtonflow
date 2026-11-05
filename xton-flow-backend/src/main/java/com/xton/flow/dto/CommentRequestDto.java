package com.xton.flow.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;

@Data
public class CommentRequestDto {

    @NotBlank(message = "Comment content is required")
    private String content;

    private String taskId;
}