package com.xton.flow.repository;

import com.xton.flow.model.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, String> {
    List<ChecklistItem> findByTaskIdOrderByPositionAsc(String taskId);
    void deleteByTaskId(String taskId);
    long countByTaskId(String taskId);
    long countByTaskIdAndCheckedTrue(String taskId);
}
