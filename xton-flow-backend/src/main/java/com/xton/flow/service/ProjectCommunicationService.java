package com.xton.flow.service;

import com.xton.flow.dto.CreateNotificationDto;
import com.xton.flow.model.Board;
import com.xton.flow.model.Notification;
import com.xton.flow.model.User;
import com.xton.flow.repository.BoardMemberRepository;
import com.xton.flow.repository.BoardRepository;
import com.xton.flow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for handling cross-project/team communications
 * This addresses the restaurant/bar scenario where different teams need to communicate
 */
@Service
@RequiredArgsConstructor
public class ProjectCommunicationService {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;

    /**
     * Sends a request from one team to another (e.g., bartender to kitchen staff)
     * @param message The request message
     * @param senderId The ID of the user sending the request
     * @param recipientIds The IDs of the users receiving the request
     * @param sourceBoardId The board where the request originated
     * @param targetBoardId The board where the request is targeted (optional)
     * @param relatedTaskId The task related to the request (optional)
     */
    public void sendCrossProjectRequest(String message, String senderId, List<String> recipientIds, 
                                       String sourceBoardId, String targetBoardId, String relatedTaskId) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        for (String recipientId : recipientIds) {
            notificationService.createRequestNotification(
                message,
                recipientId,
                senderId,
                targetBoardId != null ? targetBoardId : sourceBoardId,
                relatedTaskId
            );
        }
    }

    /**
     * Sends a completion notification to relevant parties when a task is completed
     * @param message The completion message
     * @param completerId The ID of the user who completed the task
     * @param recipientIds The IDs of users to notify about the completion
     * @param boardId The board where the task was completed
     * @param taskId The task that was completed
     */
    public void sendCompletionNotification(String message, String completerId, List<String> recipientIds, 
                                          String boardId, String taskId) {
        User completer = userRepository.findById(completerId)
                .orElseThrow(() -> new RuntimeException("Completer not found"));

        for (String recipientId : recipientIds) {
            CreateNotificationDto dto = new CreateNotificationDto();
            dto.setMessage(message);
            dto.setType(Notification.NotificationType.COMPLETION);
            dto.setRecipientId(recipientId);
            dto.setSenderId(completerId);
            dto.setBoardId(boardId);
            dto.setTaskId(taskId);
            
            notificationService.createNotification(dto);
        }
    }

    /**
     * Sends a project update notification to multiple teams/boards
     * @param message The update message
     * @param senderId The ID of the user sending the update
     * @param boardIds The IDs of boards to notify
     * @param recipientIds The specific user IDs to notify (optional, if null notifies all members of boards)
     */
    public void sendProjectUpdate(String message, String senderId, List<String> boardIds, List<String> recipientIds) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        if (recipientIds != null && !recipientIds.isEmpty()) {
            // Notify specific users
            for (String recipientId : recipientIds) {
                for (String boardId : boardIds) {
                    notificationService.createProjectNotification(
                        message,
                        recipientId,
                        senderId,
                        boardId
                    );
                }
            }
        } else {
            // Notify all members of the specified boards
            for (String boardId : boardIds) {
                Board board = boardRepository.findById(boardId)
                        .orElseThrow(() -> new RuntimeException("Board not found"));
                
                // Get all members of the board and notify them
                var boardMembers = boardMemberRepository.findByBoardId(boardId);
                List<String> memberIds = boardMembers.stream()
                        .map(member -> member.getUser().getId())
                        .collect(Collectors.toList());
                
                for (String memberId : memberIds) {
                    if (!memberId.equals(senderId)) { // Don't notify the sender
                        notificationService.createProjectNotification(
                            message,
                            memberId,
                            senderId,
                            boardId
                        );
                    }
                }
            }
        }
    }

    /**
     * Creates a notification for when one team completes work that affects another team
     * For example: Backend team finishes API that frontend team needs
     */
    public void notifyDependencyReady(String message, String senderId, List<String> dependentTeamMemberIds, 
                                    String sourceBoardId, String dependentBoardId, String relatedTaskId) {
        for (String memberId : dependentTeamMemberIds) {
            notificationService.createProjectNotification(
                message,
                memberId,
                senderId,
                dependentBoardId
            );
        }
    }
}