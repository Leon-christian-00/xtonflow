package com.xton.flow.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.xton.flow.model.BoardMember;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "xton_notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private NotificationType type; // TASK_UPDATE, BOARD_UPDATE, SYSTEM_MESSAGE, PROJECT_UPDATE, etc.

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private NotificationStatus status; // UNREAD, READ

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id")
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Enumerated(EnumType.STRING)
    @Column(name = "board_role")
    private BoardMember.MemberRole boardRole;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum NotificationType {
        TASK_UPDATE, // When a task is created/updated/completed
        BOARD_UPDATE, // When a board is shared or updated
        SYSTEM_MESSAGE, // General system notifications
        PROJECT_UPDATE, // Cross-project updates (your restaurant example)
        MENTION, // When a user is mentioned in a comment
        REQUEST, // When a request is made (like bartender requesting food)
        COMPLETION // When a task/project is completed
    }

    public enum NotificationStatus {
        UNREAD, READ
    }
}