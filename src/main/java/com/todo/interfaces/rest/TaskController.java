package com.todo.interfaces.rest;

import com.todo.application.service.TaskCommandService;
import com.todo.application.service.TaskQueryService;
import com.todo.application.service.TimeStatusService;
import com.todo.domain.model.Category;
import com.todo.domain.model.Task;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import com.todo.interfaces.rest.dto.TaskResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private static final Set<String> VALID_VIEWS = Set.of("all", "category", "today");

    private final TaskCommandService taskCommandService;
    private final TaskQueryService taskQueryService;
    private final TimeStatusService timeStatusService;

    public TaskController(TaskCommandService taskCommandService,
                          TaskQueryService taskQueryService,
                          TimeStatusService timeStatusService) {
        this.taskCommandService = taskCommandService;
        this.taskQueryService = taskQueryService;
        this.timeStatusService = timeStatusService;
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody CreateTaskRequest request) {
        Task task = taskCommandService.createTask(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(TaskResponse.from(task, timeStatusService));
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> listTasks(
            @RequestParam(defaultValue = "all") String view,
            @RequestParam(required = false) Category category) {

        if (!VALID_VIEWS.contains(view)) {
            return ResponseEntity.badRequest().build();
        }

        List<Task> tasks;
        switch (view) {
            case "today":
                tasks = taskQueryService.getToday();
                break;
            case "category":
                if (category == null) {
                    return ResponseEntity.badRequest().build();
                }
                tasks = taskQueryService.getByCategory(category);
                break;
            default:
                tasks = taskQueryService.getAll();
                break;
        }

        List<TaskResponse> response = tasks.stream()
                .map(t -> TaskResponse.from(t, timeStatusService))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
}
