package com.xton.flow.dto;

import com.xton.flow.model.BoardMember;
import com.xton.flow.model.Notification;
import lombok.Data;

@Data
public class CreateNotificationDto {
    private String message;
    private Notification.NotificationType type;
    private String recipientId;
    private String senderId;
    private String boardId;
    private String taskId;
    private BoardMember.MemberRole boardRole;
}