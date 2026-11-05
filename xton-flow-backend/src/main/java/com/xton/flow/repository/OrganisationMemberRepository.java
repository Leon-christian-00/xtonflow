package com.xton.flow.repository;

import com.xton.flow.model.OrganisationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganisationMemberRepository extends JpaRepository<OrganisationMember, String> {
    List<OrganisationMember> findByUserId(String userId);
    List<OrganisationMember> findByOrganisationId(String organisationId);
    Optional<OrganisationMember> findByUserIdAndOrganisationId(String userId, String organisationId);
    boolean existsByUserIdAndOrganisationId(String userId, String organisationId);
    List<OrganisationMember> findByUserIdAndStatus(String userId, OrganisationMember.MemberStatus status);
}
