package com.xton.flow.dto;

import com.xton.flow.model.Board;
import lombok.Data;

@Data
public class BoardRequestDto {
    private String name;
    private String description;
    private Board.BoardVisibility visibility;
}