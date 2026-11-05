package com.xton.flow.repository;

import com.xton.flow.model.Task;
import com.xton.flow.model.Task.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByBoardId(String boardId);
    List<Task> findByAssigneeId(String assigneeId);
    List<Task> findByBoardIdAndStatus(String boardId, TaskStatus status);
}