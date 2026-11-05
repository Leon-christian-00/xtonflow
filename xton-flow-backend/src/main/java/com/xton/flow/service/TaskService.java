package com.xton.flow.service;

import com.xton.flow.dto.TaskRequestDto;
import com.xton.flow.model.Board;
import com.xton.flow.model.BoardMember;
import com.xton.flow.model.ChecklistItem;
import com.xton.flow.model.Task;
import com.xton.flow.model.TaskUpdateEvent;
import com.xton.flow.model.User;
import com.xton.flow.repository.BoardMemberRepository;
import com.xton.flow.repository.BoardRepository;
import com.xton.flow.repository.ChecklistItemRepository;
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
public class TaskService {

    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;
    private final ResourceAuthorizationService authorizationService;

    @Transactional
    public Task createTask(TaskRequestDto dto, String userEmail) {
        authorizationService.requireBoardMember(dto.getBoardId(), userEmail);
        Board board = boardRepository.findById(dto.getBoardId())
                .orElseThrow(() -> new RuntimeException("Board not found with ID: " + dto.getBoardId()));

        Task.TaskStatus status = dto.getStatus() != null ? dto.getStatus() : Task.TaskStatus.TODO;
        Task.Priority priority = dto.getPriority() != null ? dto.getPriority() : Task.Priority.MEDIUM;

        Task task = Task.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .status(status)
                .priority(priority)
                .dueDate(dto.getDueDate())
                .labelColor(dto.getLabelColor())
                .coverColor(dto.getCoverColor())
                .board(board)
                .build();

        if (dto.getAssigneeId() != null && !dto.getAssigneeId().isEmpty()) {
            User assignee = userRepository.findById(dto.getAssigneeId())
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + dto.getAssigneeId()));
            task.setAssignee(assignee);
        }

        Task savedTask = taskRepository.save(task);
        publishEvent("CREATED", savedTask);
        
        // Send notification to relevant users
        sendTaskNotification(savedTask, "TASK_CREATED", "A new task has been created", "TASK_UPDATE");
        return savedTask;
    }

    public Task getTaskById(String taskId, String userEmail) {
        return authorizationService.requireTaskMember(taskId, userEmail);
    }

    public List<Task> getTasksByBoard(String boardId, String userEmail) {
        authorizationService.requireBoardMember(boardId, userEmail);
        return taskRepository.findByBoardId(boardId);
    }

    @Transactional
    public Task updateTask(String taskId, TaskRequestDto dto, String userEmail) {
        Task existingTask = getTaskById(taskId, userEmail);

        String oldTitle = existingTask.getTitle();
        Task.TaskStatus oldStatus = existingTask.getStatus();
        Task.Priority oldPriority = existingTask.getPriority();
        User oldAssignee = existingTask.getAssignee();

        if (dto.getTitle() != null) existingTask.setTitle(dto.getTitle());
        if (dto.getDescription() != null) existingTask.setDescription(dto.getDescription());
        if (dto.getStatus() != null) existingTask.setStatus(dto.getStatus());
        if (dto.getPriority() != null) existingTask.setPriority(dto.getPriority());

        if (dto.getAssigneeId() != null) {
            if (dto.getAssigneeId().isEmpty()) {
                existingTask.setAssignee(null);
            } else {
                User assignee = userRepository.findById(dto.getAssigneeId())
                        .orElseThrow(() -> new RuntimeException("User not found with ID: " + dto.getAssigneeId()));
                existingTask.setAssignee(assignee);
            }
        }

        if (dto.getDueDate() != null) existingTask.setDueDate(dto.getDueDate());
        if (dto.getLabelColor() != null) existingTask.setLabelColor(dto.getLabelColor());
        if (dto.getCoverColor() != null) existingTask.setCoverColor(dto.getCoverColor());
        if (dto.getPosition() != null) existingTask.setPosition(dto.getPosition());

        Task updatedTask = taskRepository.save(existingTask);
        publishEvent("UPDATED", updatedTask);
        
        // Send notification if significant changes occurred
        String changeMessage = buildChangeMessage(oldTitle, oldStatus, oldPriority, oldAssignee, updatedTask);
        if (!changeMessage.isEmpty()) {
            sendTaskNotification(updatedTask, "TASK_UPDATED", changeMessage, "TASK_UPDATE");
        }
        return updatedTask;
    }

    @Transactional
    public Task updateTaskStatus(String taskId, Task.TaskStatus newStatus, String userEmail) {
        Task task = getTaskById(taskId, userEmail);
        Task.TaskStatus oldStatus = task.getStatus();
        task.setStatus(newStatus);
        Task updatedTask = taskRepository.save(task);
        publishEvent("STATUS_CHANGED", updatedTask);
        
        // Send notification about status change
        String statusChangeMessage = "Task '" + task.getTitle() + "' status changed from " + oldStatus + " to " + newStatus;
        sendTaskNotification(updatedTask, "STATUS_CHANGED", statusChangeMessage, "TASK_UPDATE");
        return updatedTask;
    }

    @Transactional
    public void deleteTask(String taskId, String userEmail) {
        Task task = getTaskById(taskId, userEmail);
        taskRepository.delete(task);
        publishEvent("DELETED", task);
    }

    public List<ChecklistItem> getChecklist(String taskId, String userEmail) {
        authorizationService.requireTaskMember(taskId, userEmail);
        return checklistItemRepository.findByTaskIdOrderByPositionAsc(taskId);
    }

    @Transactional
    public ChecklistItem addChecklistItem(String taskId, String content, String userEmail) {
        authorizationService.requireTaskMember(taskId, userEmail);
        Task task = authorizationService.requireTaskMember(taskId, userEmail);
        long count = checklistItemRepository.countByTaskId(taskId);
        ChecklistItem item = ChecklistItem.builder()
                .content(content)
                .task(task)
                .position((int) count)
                .build();
        return checklistItemRepository.save(item);
    }

    @Transactional
    public ChecklistItem toggleChecklistItem(String itemId, String userEmail) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found"));
        authorizationService.requireTaskMember(item.getTask().getId(), userEmail);
        item.setChecked(!item.isChecked());
        return checklistItemRepository.save(item);
    }

    @Transactional
    public void deleteChecklistItem(String itemId, String userEmail) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Checklist item not found"));
        authorizationService.requireTaskMember(item.getTask().getId(), userEmail);
        checklistItemRepository.deleteById(itemId);
    }

    @Transactional
    public void reorderTasks(List<java.util.Map<String, Object>> order, String userEmail) {
        for (java.util.Map<String, Object> entry : order) {
            String taskId = (String) entry.get("id");
            int position = (int) entry.get("position");
            authorizationService.requireTaskMember(taskId, userEmail);
            taskRepository.findById(taskId).ifPresent(task -> {
                task.setPosition(position);
                taskRepository.save(task);
            });
        }
    }

    private void publishEvent(String eventType, Task task) {
        TaskUpdateEvent event = TaskUpdateEvent.builder()
                .eventType(eventType)
                .task(task)
                .timestamp(System.currentTimeMillis())
                .build();
        messagingTemplate.convertAndSend("/topic/board/" + task.getBoard().getId() + "/tasks", event);
    }

    private String buildChangeMessage(String oldTitle, Task.TaskStatus oldStatus, Task.Priority oldPriority, User oldAssignee, Task updatedTask) {
        StringBuilder changes = new StringBuilder("Task updated: ");
        boolean hasChanges = false;

        if (!oldTitle.equals(updatedTask.getTitle())) {
            changes.append("Title changed, ");
            hasChanges = true;
        }
        if (oldStatus != updatedTask.getStatus()) {
            changes.append("Status changed, ");
            hasChanges = true;
        }
        if (oldPriority != updatedTask.getPriority()) {
            changes.append("Priority changed, ");
            hasChanges = true;
        }
        if ((oldAssignee == null && updatedTask.getAssignee() != null) ||
            (oldAssignee != null && updatedTask.getAssignee() == null) ||
            (oldAssignee != null && updatedTask.getAssignee() != null && !oldAssignee.getId().equals(updatedTask.getAssignee().getId()))) {
            changes.append("Assignee changed, ");
            hasChanges = true;
        }

        if (hasChanges) {
            return changes.substring(0, changes.length() - 2); // Remove trailing ", "
        }
        return "";
    }

    private void sendTaskNotification(Task task, String eventType, String message, String notificationType) {
        // Get all members of the board to notify them
        List<BoardMember> boardMembers = boardMemberRepository.findByBoardId(task.getBoard().getId());
        String senderId = task.getAssignee() != null ? task.getAssignee().getId() : task.getBoard().getCreatedBy().getId();

        // Notify all board members
        for (BoardMember member : boardMembers) {
            if (!member.getUser().getId().equals(senderId)) { // Don't notify the sender themselves
                notificationService.createTaskNotification(
                    message,
                    com.xton.flow.model.Notification.NotificationType.valueOf(notificationType),
                    task.getId(),
                    member.getUser().getId(),
                    senderId
                );
            }
        }

        // If task is assigned to someone, notify the assignee as well (if different from sender)
        if (task.getAssignee() != null && !task.getAssignee().getId().equals(senderId)) {
            notificationService.createTaskNotification(
                message,
                com.xton.flow.model.Notification.NotificationType.valueOf(notificationType),
                task.getId(),
                task.getAssignee().getId(),
                senderId
            );
        }

        // Also notify the board creator if they're not the sender
        if (!task.getBoard().getCreatedBy().getId().equals(senderId)) {
            notificationService.createTaskNotification(
                message,
                com.xton.flow.model.Notification.NotificationType.valueOf(notificationType),
                task.getId(),
                task.getBoard().getCreatedBy().getId(),
                senderId
            );
        }
    }
}