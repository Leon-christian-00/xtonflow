package com.xton.flow.repository;

import com.xton.flow.model.BoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardMemberRepository extends JpaRepository<BoardMember, String> {
    List<BoardMember> findByBoardId(String boardId);
    List<BoardMember> findByUserId(String userId);
    Optional<BoardMember> findByBoardIdAndUserId(String boardId, String userId);
    void deleteByBoardIdAndUserId(String boardId, String userId);
    void deleteByBoardId(String boardId);
    boolean existsByBoardIdAndUserId(String boardId, String userId);
}