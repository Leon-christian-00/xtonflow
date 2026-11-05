package com.xton.flow.dto;

import com.xton.flow.model.BoardMember;
import com.xton.flow.model.Notification;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationDto {
    private String id;
    private String message;
    private Notification.NotificationType type;
    private Notification.NotificationStatus status;
    private String recipientId;
    private String senderId;
    private String boardId;
    private String taskId;
    private BoardMember.MemberRole boardRole;
    private LocalDateTime createdAt;
    
    // Additional fields for UI display
    private String senderName;
    private String boardName;
    private String taskTitle;
}