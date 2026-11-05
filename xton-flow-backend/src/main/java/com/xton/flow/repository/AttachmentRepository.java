package com.xton.flow.repository;

import com.xton.flow.model.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, String> {
    List<Attachment> findByTaskId(String taskId);
    void deleteByTaskId(String taskId);
}