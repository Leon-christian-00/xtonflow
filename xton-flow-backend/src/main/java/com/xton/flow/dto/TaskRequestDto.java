package com.xton.flow.dto;

import com.xton.flow.model.Task;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class TaskRequestDto {

    private String title;
    private String description;
    private Task.TaskStatus status;
    private Task.Priority priority;
    private LocalDateTime dueDate;
    private LocalDate startDate;
    private boolean startDatePresent;
    private String boardId;
    private String assigneeId;
    private String labelColor;
    private String coverColor;
    private Integer position;

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
        this.startDatePresent = true;
    }
}