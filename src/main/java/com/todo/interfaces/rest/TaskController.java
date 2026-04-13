package com.todo.interfaces.rest;

import com.todo.application.service.TaskCommandService;
import com.todo.domain.model.Task;
import com.todo.interfaces.rest.dto.TaskResponse;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskCommandService taskCommandService;

    public TaskController(TaskCommandService taskCommandService) {
        this.taskCommandService = taskCommandService;
    }

    @PatchMapping("/{id}/priority")
    public ResponseEntity<TaskResponse> updatePriority(
            @PathVariable String id,
            @Valid @RequestBody UpdatePriorityRequest request) {
        Task task = taskCommandService.updatePriority(id, request);
        return ResponseEntity.ok(TaskResponse.from(task));
    }
}
