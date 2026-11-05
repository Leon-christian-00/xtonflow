package com.xton.flow.service;

import com.xton.flow.dto.CreateNotificationDto;
import com.xton.flow.dto.NotificationDto;
import com.xton.flow.model.*;
import com.xton.flow.repository.BoardRepository;
import com.xton.flow.repository.NotificationRepository;
import com.xton.flow.repository.TaskRepository;
import com.xton.flow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public NotificationDto createNotification(CreateNotificationDto dto) {
        User recipient = userRepository.findById(dto.getRecipientId())
                .orElseThrow(() -> new RuntimeException("Recipient not found"));

        Notification.NotificationBuilder builder = Notification.builder()
                .message(dto.getMessage())
                .type(dto.getType())
                .recipient(recipient)
                .status(Notification.NotificationStatus.UNREAD);

        if (dto.getSenderId() != null) {
            User sender = userRepository.findById(dto.getSenderId())
                    .orElseThrow(() -> new RuntimeException("Sender not found"));
            builder.sender(sender);
        }

        if (dto.getBoardId() != null) {
            Board board = boardRepository.findById(dto.getBoardId())
                    .orElseThrow(() -> new RuntimeException("Board not found"));
            builder.board(board);
        }

        if (dto.getTaskId() != null) {
            Task task = taskRepository.findById(dto.getTaskId())
                    .orElseThrow(() -> new RuntimeException("Task not found"));
            builder.task(task);
        }

        if (dto.getBoardRole() != null) {
            builder.boardRole(dto.getBoardRole());
        }

        Notification notification = notificationRepository.save(builder.build());

        // Send real-time notification via WebSocket
        messagingTemplate.convertAndSendToUser(
            recipient.getEmail(),
            "/queue/notifications",
            mapToDto(notification)
        );

        return mapToDto(notification);
    }

    @Transactional
    public List<NotificationDto> getUserNotifications(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Notification> notifications = notificationRepository.findByRecipientOrderByCreatedAtDesc(user);

        return notifications.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<NotificationDto> getUserUnreadNotifications(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Notification> notifications = notificationRepository.findByRecipientAndStatusOrderByCreatedAtDesc(
                user, 
                Notification.NotificationStatus.UNREAD
        );

        return notifications.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public Long getUnreadNotificationCount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return notificationRepository.countUnreadNotifications(user);
    }

    @Transactional
    public void markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        // Verify that the notification belongs to the user
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Notification does not belong to user");
        }

        notification.setStatus(Notification.NotificationStatus.READ);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Notification> notifications = notificationRepository.findByRecipientAndStatusOrderByCreatedAtDesc(
                user, 
                Notification.NotificationStatus.UNREAD
        );

        notifications.forEach(notification -> notification.setStatus(Notification.NotificationStatus.READ));
        notificationRepository.saveAll(notifications);
    }

    @Transactional
    public void deleteNotification(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        // Verify that the notification belongs to the user
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Notification does not belong to user");
        }

        notificationRepository.delete(notification);
    }

    private NotificationDto mapToDto(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .message(notification.getMessage())
                .type(notification.getType())
                .status(notification.getStatus())
                .recipientId(notification.getRecipient().getId())
                .senderId(notification.getSender() != null ? notification.getSender().getId() : null)
                .boardId(notification.getBoard() != null ? notification.getBoard().getId() : null)
                .taskId(notification.getTask() != null ? notification.getTask().getId() : null)
                .createdAt(notification.getCreatedAt())
                .senderName(notification.getSender() != null ? notification.getSender().getFullName() : null)
                .boardName(notification.getBoard() != null ? notification.getBoard().getName() : null)
                .taskTitle(notification.getTask() != null ? notification.getTask().getTitle() : null)
                .boardRole(notification.getBoardRole())
                .build();
    }

    // Convenience methods for common notification types
    public NotificationDto createTaskNotification(String message, Notification.NotificationType type, String taskId, String recipientId, String senderId) {
        CreateNotificationDto dto = new CreateNotificationDto();
        dto.setMessage(message);
        dto.setType(type);
        dto.setTaskId(taskId);
        dto.setRecipientId(recipientId);
        dto.setSenderId(senderId);

        return createNotification(dto);
    }

    public NotificationDto createBoardNotification(String message, Notification.NotificationType type, String boardId, String recipientId, String senderId) {
        CreateNotificationDto dto = new CreateNotificationDto();
        dto.setMessage(message);
        dto.setType(type);
        dto.setBoardId(boardId);
        dto.setRecipientId(recipientId);
        dto.setSenderId(senderId);

        return createNotification(dto);
    }

    public NotificationDto createBoardRequestNotification(String message, String recipientId, String senderId, String boardId, BoardMember.MemberRole role) {
        CreateNotificationDto dto = new CreateNotificationDto();
        dto.setMessage(message);
        dto.setType(Notification.NotificationType.REQUEST);
        dto.setRecipientId(recipientId);
        dto.setSenderId(senderId);
        dto.setBoardId(boardId);
        dto.setBoardRole(role);

        return createNotification(dto);
    }

    public NotificationDto createSystemNotification(String message, String recipientId) {
        CreateNotificationDto dto = new CreateNotificationDto();
        dto.setMessage(message);
        dto.setType(Notification.NotificationType.SYSTEM_MESSAGE);
        dto.setRecipientId(recipientId);

        return createNotification(dto);
    }

    public NotificationDto createProjectNotification(String message, String recipientId, String senderId, String boardId) {
        CreateNotificationDto dto = new CreateNotificationDto();
        dto.setMessage(message);
        dto.setType(Notification.NotificationType.PROJECT_UPDATE);
        dto.setRecipientId(recipientId);
        dto.setSenderId(senderId);
        dto.setBoardId(boardId);

        return createNotification(dto);
    }

    public NotificationDto createRequestNotification(String message, String recipientId, String senderId, String boardId, String taskId) {
        CreateNotificationDto dto = new CreateNotificationDto();
        dto.setMessage(message);
        dto.setType(Notification.NotificationType.REQUEST);
        dto.setRecipientId(recipientId);
        dto.setSenderId(senderId);
        dto.setBoardId(boardId);
        dto.setTaskId(taskId);

        return createNotification(dto);
    }
}