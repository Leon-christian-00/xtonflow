package com.xton.flow.service;

import com.xton.flow.dto.BoardRequestDto;
import com.xton.flow.model.*;
import com.xton.flow.repository.*;
import com.xton.flow.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final OrganisationMemberRepository orgMemberRepository;
    private final OrganisationRepository organisationRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final JwtUtil jwtUtil;
        private final ResourceAuthorizationService authorizationService;
        private final TaskRepository taskRepository;
        private final ChecklistItemRepository checklistItemRepository;
        private final CommentRepository commentRepository;
        private final AttachmentRepository attachmentRepository;

    @Transactional
    public Board createBoard(BoardRequestDto dto, String userEmail, String orgId) {
        User creator = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        authorizationService.requireOrganisationMember(orgId, userEmail);

        Organisation org = organisationRepository.findById(orgId)
                .orElseThrow(() -> new RuntimeException("Organisation not found"));

        Board board = Board.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .organisation(org)
                .createdBy(creator)
                .visibility(dto.getVisibility() != null ? dto.getVisibility() : Board.BoardVisibility.TEAM)
                .build();

        board = boardRepository.save(board);

        BoardMember member = BoardMember.builder()
                .board(board)
                .user(creator)
                .role(BoardMember.MemberRole.ADMIN)
                .build();
        boardMemberRepository.save(member);

        return board;
    }

        public List<Board> getBoardsByOrg(String orgId, String userEmail) {
                authorizationService.requireOrganisationMember(orgId, userEmail);
        return boardRepository.findByOrganisationId(orgId);
    }

    public List<Board> getBoardsForUser(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Set<String> orgIds = orgMemberRepository.findByUserIdAndStatus(user.getId(), OrganisationMember.MemberStatus.ACTIVE)
                .stream()
                .map(member -> member.getOrganisation().getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Set<String> boardIds = boardMemberRepository.findByUserId(user.getId())
                .stream()
                .map(member -> member.getBoard().getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Board> boards = boardRepository.findByOrganisationIdIn(orgIds);
        if (!boardIds.isEmpty()) {
            boards.addAll(boardRepository.findAllById(boardIds));
        }

        return boards.stream()
                .distinct()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
    }

        public Board getBoardById(String boardId, String userEmail) {
                authorizationService.requireBoardMember(boardId, userEmail);
        return boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Board not found"));
    }

        public List<User> getBoardMembers(String boardId, String userEmail) {
                authorizationService.requireBoardMember(boardId, userEmail);
        return boardMemberRepository.findByBoardId(boardId).stream()
                .map(BoardMember::getUser)
                .collect(Collectors.toList());
    }

    @Transactional
    public void addMemberToBoard(String boardId, String userId, BoardMember.MemberRole role, String requesterEmail) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Board not found"));

        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        authorizationService.requireBoardAdmin(boardId, requesterEmail);

        boolean isCreator = board.getCreatedBy().getId().equals(requester.getId());
        boolean isAdmin = boardMemberRepository.findByBoardIdAndUserId(boardId, requester.getId())
                .map(m -> m.getRole() == BoardMember.MemberRole.ADMIN)
                .orElse(false);

        if (!isCreator && !isAdmin) {
            throw new RuntimeException("Only the board creator or an admin can add members");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (boardMemberRepository.existsByBoardIdAndUserId(boardId, userId)) {
            throw new RuntimeException("User is already a member of this board");
        }

        boardMemberRepository.save(BoardMember.builder()
                .board(board).user(user).role(role).build());

        notificationService.createBoardNotification(
                "You have been added to the board '" + board.getName() + "' as a " + role + ".",
                Notification.NotificationType.BOARD_UPDATE,
                boardId, userId, requester.getId());
    }

    @Transactional
    public void requestAddMemberToBoard(String boardId, String userId, BoardMember.MemberRole role, String requesterEmail) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Board not found"));

        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        authorizationService.requireBoardAdmin(boardId, requesterEmail);

        boolean isCreator = board.getCreatedBy().getId().equals(requester.getId());
        boolean isAdmin = boardMemberRepository.findByBoardIdAndUserId(boardId, requester.getId())
                .map(m -> m.getRole() == BoardMember.MemberRole.ADMIN)
                .orElse(false);

        if (!isCreator && !isAdmin) {
            throw new RuntimeException("Only the board creator or an admin can share this board");
        }

        if (boardMemberRepository.existsByBoardIdAndUserId(boardId, userId)) {
            throw new RuntimeException("User is already a member of this board");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        notificationService.createBoardRequestNotification(
                requester.getFullName() + " has invited you to join the board '" + board.getName() + "'.",
                userId, requester.getId(), boardId, role);
    }

    @Transactional
    public void acceptBoardShareRequest(String notificationId, String currentUserEmail) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (notification.getType() != Notification.NotificationType.REQUEST) {
            throw new RuntimeException("Invalid notification type");
        }

        if (!notification.getRecipient().getEmail().equals(currentUserEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        if (boardMemberRepository.existsByBoardIdAndUserId(notification.getBoard().getId(), notification.getRecipient().getId())) {
            notification.setStatus(Notification.NotificationStatus.READ);
            notificationRepository.save(notification);
            return;
        }

        addMemberToBoard(notification.getBoard().getId(), notification.getRecipient().getId(),
                notification.getBoardRole() != null ? notification.getBoardRole() : BoardMember.MemberRole.MEMBER,
                notification.getSender() != null ? notification.getSender().getEmail() : currentUserEmail);

        notification.setStatus(Notification.NotificationStatus.READ);
        notificationRepository.save(notification);
    }

    @Transactional
    public void declineBoardShareRequest(String notificationId, String currentUserEmail) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (notification.getType() != Notification.NotificationType.REQUEST) {
            throw new RuntimeException("Invalid notification type");
        }

        if (!notification.getRecipient().getEmail().equals(currentUserEmail)) {
            throw new RuntimeException("Unauthorized");
        }

        notification.setStatus(Notification.NotificationStatus.READ);
        notificationRepository.save(notification);

        if (notification.getSender() != null) {
            notificationService.createSystemNotification(
                    notification.getRecipient().getFullName() + " declined the invite to join '" + notification.getBoard().getName() + "'.",
                    notification.getSender().getId());
        }
    }

    @Transactional
        public void removeMember(String boardId, String userId, String requesterEmail) {
                authorizationService.requireBoardAdmin(boardId, requesterEmail);
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Board not found"));
        boardMemberRepository.deleteByBoardIdAndUserId(boardId, userId);
        notificationService.createSystemNotification(
                "You have been removed from the board '" + board.getName() + "'.", userId);
    }

    @Transactional
    public void deleteBoard(String boardId, String requesterEmail) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new RuntimeException("Board not found"));

        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean isCreator = board.getCreatedBy().getId().equals(requester.getId());
        boolean isAdmin = boardMemberRepository.findByBoardIdAndUserId(boardId, requester.getId())
                .map(member -> member.getRole() == BoardMember.MemberRole.ADMIN)
                .orElse(false);

        if (!isCreator && !isAdmin) {
            throw new RuntimeException("Only the board creator or an admin can delete this board");
        }

                taskRepository.findByBoardId(boardId).forEach(task -> {
                        checklistItemRepository.deleteByTaskId(task.getId());
                        commentRepository.deleteByTaskId(task.getId());
                        attachmentRepository.deleteByTaskId(task.getId());
                        notificationRepository.deleteByTaskId(task.getId());
                });
                notificationRepository.deleteByBoardId(boardId);
        boardMemberRepository.deleteByBoardId(boardId);
        boardRepository.delete(board);
    }
}
