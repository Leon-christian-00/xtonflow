package com.xton.flow.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaskRequestDtoTest {

    @Test
    void startDateIsTrackedWhenProvided() {
        TaskRequestDto request = new TaskRequestDto();
        request.setStartDate(LocalDate.of(2026, 11, 5));

        assertEquals(LocalDate.of(2026, 11, 5), request.getStartDate());
        assertTrue(request.isStartDatePresent());
    }

    @Test
    void omittedStartDateIsNotMarkedForUpdate() {
        TaskRequestDto request = new TaskRequestDto();

        assertNull(request.getStartDate());
        assertFalse(request.isStartDatePresent());
    }

    @Test
    void nullStartDateCanBeExplicitlyCleared() {
        TaskRequestDto request = new TaskRequestDto();
        request.setStartDate(LocalDate.of(2026, 11, 5));
        request.setStartDate(null);

        assertNull(request.getStartDate());
        assertTrue(request.isStartDatePresent());
    }
}
