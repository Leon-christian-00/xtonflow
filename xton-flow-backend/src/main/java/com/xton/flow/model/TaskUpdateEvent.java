package com.xton.flow.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskUpdateEvent {
    private String eventType; // CREATED, UPDATED, DELETED, STATUS_CHANGED
    private Task task;
    private String userId;
    private Long timestamp;
}