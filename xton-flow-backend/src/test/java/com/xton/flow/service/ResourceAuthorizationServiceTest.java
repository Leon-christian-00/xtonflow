package com.xton.flow.service;

import com.xton.flow.model.Board;
import com.xton.flow.model.BoardMember;
import com.xton.flow.model.User;
import com.xton.flow.repository.BoardMemberRepository;
import com.xton.flow.repository.BoardRepository;
import com.xton.flow.repository.OrganisationMemberRepository;
import com.xton.flow.repository.TaskRepository;
import com.xton.flow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceAuthorizationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private BoardMemberRepository boardMemberRepository;

    @Mock
    private OrganisationMemberRepository organisationMemberRepository;

    @Mock
    private TaskRepository taskRepository;

    private ResourceAuthorizationService authorizationService;

    @BeforeEach
    void setUp() {
        authorizationService = new ResourceAuthorizationService(
                userRepository,
                boardRepository,
                boardMemberRepository,
                organisationMemberRepository,
                taskRepository);
    }

    @Test
    void requireBoardMemberReturnsBoardForMember() {
        User user = User.builder().id("user-1").email("member@example.com").build();
        Board board = Board.builder().id("board-1").build();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(boardRepository.findById(board.getId())).thenReturn(Optional.of(board));
        when(boardMemberRepository.existsByBoardIdAndUserId(board.getId(), user.getId())).thenReturn(true);

        assertSame(board, authorizationService.requireBoardMember(board.getId(), user.getEmail()));
    }

    @Test
    void requireBoardMemberRejectsNonMember() {
        User user = User.builder().id("user-1").email("outsider@example.com").build();
        Board board = Board.builder().id("board-1").build();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(boardRepository.findById(board.getId())).thenReturn(Optional.of(board));
        when(boardMemberRepository.existsByBoardIdAndUserId(board.getId(), user.getId())).thenReturn(false);

        assertThrows(AccessDeniedException.class,
                () -> authorizationService.requireBoardMember(board.getId(), user.getEmail()));
    }
}
