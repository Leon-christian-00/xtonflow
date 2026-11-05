package com.xton.flow.repository;

import com.xton.flow.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface BoardRepository extends JpaRepository<Board, String> {
    List<Board> findByOrganisationId(String organisationId);
    List<Board> findByOrganisationIdIn(Collection<String> organisationIds);
}
