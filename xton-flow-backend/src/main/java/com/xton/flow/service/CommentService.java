package com.xton.flow.service;

import com.xton.flow.dto.CommentRequestDto;
import com.xton.flow.dto.CommentResponseDto;
import com.xton.flow.model.Comment;
import com.xton.flow.model.BoardMember;
import com.xton.flow.model.Task;
import com.xton.flow.model.User;
import com.xton.flow.repository.BoardMemberRepository;
import com.xton.flow.repository.CommentRepository;
import com.xton.flow.repository.TaskRepository;
import com.xton.flow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final NotificationService notificationService;

    @Transactional
    public CommentResponseDto createComment(CommentRequestDto request, String authorEmail) {
        Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new RuntimeException("Task not found"));

        User author = userRepository.findByEmail(authorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Comment comment = Comment.builder()
                .content(request.getContent())
                .task(task)
                .author(author)
                .build();

        comment = commentRepository.save(comment);

        notifyBoardMembers(task, author, comment);

        return mapToResponseDto(comment);
    }

    public List<CommentResponseDto> getCommentsByTask(String taskId) {
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommentResponseDto updateComment(String commentId, String content, String userEmail) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getEmail().equals(userEmail)) {
            throw new RuntimeException("You can only edit your own comments");
        }

        comment.setContent(content);
        comment = commentRepository.save(comment);

        return mapToResponseDto(comment);
    }

    @Transactional
    public void deleteComment(String commentId, String userEmail) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getEmail().equals(userEmail)) {
            throw new RuntimeException("You can only delete your own comments");
        }

        commentRepository.delete(comment);
    }

    private CommentResponseDto mapToResponseDto(Comment comment) {
        return CommentResponseDto.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .authorName(comment.getAuthor().getFullName())
                .authorEmail(comment.getAuthor().getEmail())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }

    private void notifyBoardMembers(Task task, User author, Comment comment) {
        List<BoardMember> members = boardMemberRepository.findByBoardId(task.getBoard().getId());
        String message = author.getFullName() + " commented on task '" + task.getTitle() + "'";

        for (BoardMember member : members) {
            if (!member.getUser().getId().equals(author.getId())) {
                notificationService.createTaskNotification(
                        message,
                        com.xton.flow.model.Notification.NotificationType.MENTION,
                        task.getId(),
                        member.getUser().getId(),
                        author.getId()
                );
            }
        }
    }
}