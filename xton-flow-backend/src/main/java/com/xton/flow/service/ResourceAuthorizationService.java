package com.xton.flow.service;

import com.xton.flow.model.Board;
import com.xton.flow.model.BoardMember;
import com.xton.flow.model.OrganisationMember;
import com.xton.flow.model.Task;
import com.xton.flow.model.User;
import com.xton.flow.repository.BoardMemberRepository;
import com.xton.flow.repository.BoardRepository;
import com.xton.flow.repository.OrganisationMemberRepository;
import com.xton.flow.repository.TaskRepository;
import com.xton.flow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ResourceAuthorizationService {

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final OrganisationMemberRepository organisationMemberRepository;
    private final TaskRepository taskRepository;

    public User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user was not found"));
    }

    public Board requireBoardMember(String boardId, String email) {
        User user = requireUser(email);
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new AccessDeniedException("Board not found"));

        if (!boardMemberRepository.existsByBoardIdAndUserId(boardId, user.getId())) {
            throw new AccessDeniedException("You are not a member of this board");
        }
        return board;
    }

    public Board requireBoardAdmin(String boardId, String email) {
        Board board = requireBoardMember(boardId, email);
        User user = requireUser(email);
        boolean isCreator = board.getCreatedBy().getId().equals(user.getId());
        boolean isAdmin = boardMemberRepository.findByBoardIdAndUserId(boardId, user.getId())
                .map(member -> member.getRole() == BoardMember.MemberRole.ADMIN)
                .orElse(false);

        if (!isCreator && !isAdmin) {
            throw new AccessDeniedException("Only board administrators can perform this action");
        }
        return board;
    }

    public void requireOrganisationMember(String organisationId, String email) {
        User user = requireUser(email);
        boolean isMember = organisationMemberRepository.findByUserIdAndOrganisationId(user.getId(), organisationId)
                .map(member -> member.getStatus() == OrganisationMember.MemberStatus.ACTIVE)
                .orElse(false);

        if (!isMember) {
            throw new AccessDeniedException("You are not an active member of this organisation");
        }
    }

    public Task requireTaskMember(String taskId, String email) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new AccessDeniedException("Task not found"));
        requireBoardMember(task.getBoard().getId(), email);
        return task;
    }
}
