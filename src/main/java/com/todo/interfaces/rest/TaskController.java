package com.todo.interfaces.rest;

import com.todo.application.service.TaskCommandService;
import com.todo.domain.model.Task;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import com.todo.interfaces.rest.dto.TaskResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskCommandService taskCommandService;

    public TaskController(TaskCommandService taskCommandService) {
        this.taskCommandService = taskCommandService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody CreateTaskRequest request) {
        Task task = taskCommandService.createTask(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskResponse.from(task));
    }
}
