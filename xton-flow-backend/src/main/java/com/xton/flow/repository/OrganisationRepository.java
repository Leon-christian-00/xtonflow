package com.xton.flow.repository;

import com.xton.flow.model.Organisation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganisationRepository extends JpaRepository<Organisation, String> {
    Optional<Organisation> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
