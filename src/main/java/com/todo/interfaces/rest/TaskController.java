package com.todo.interfaces.rest;

import com.todo.application.service.TaskCommandService;
import com.todo.domain.model.Task;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import com.todo.interfaces.rest.dto.TaskResponse;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    public ResponseEntity<List<TaskResponse>> listTasks() {
        List<TaskResponse> tasks = taskCommandService.listTasks().stream()
                .map(TaskResponse::from)
                .toList();
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTask(@PathVariable String id) {
        Task task = taskCommandService.getTask(id);
        return ResponseEntity.ok(TaskResponse.from(task));
    }

    @PatchMapping("/{id}/priority")
    public ResponseEntity<TaskResponse> updatePriority(
            @PathVariable String id,
            @Valid @RequestBody UpdatePriorityRequest request) {
        Task task = taskCommandService.updatePriority(id, request);
        return ResponseEntity.ok(TaskResponse.from(task));
    }
}
