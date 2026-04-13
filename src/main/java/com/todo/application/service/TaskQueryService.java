package com.todo.application.service;

import com.todo.domain.model.Category;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;
import com.todo.domain.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskQueryService {

    private final TaskRepository taskRepository;
    private final TimeStatusService timeStatusService;

    public TaskQueryService(TaskRepository taskRepository, TimeStatusService timeStatusService) {
        this.taskRepository = taskRepository;
        this.timeStatusService = timeStatusService;
    }

    @Transactional(readOnly = true)
    public List<Task> getAll() {
        return taskRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Task> getByCategory(Category category) {
        return taskRepository.findByCategory(category);
    }

    @Transactional(readOnly = true)
    public List<Task> getToday() {
        return taskRepository.findByStatusNot(TaskStatus.DONE).stream()
                .filter(task -> {
                    TimeStatus ts = timeStatusService.computeTimeStatus(task);
                    return ts == TimeStatus.TODAY || ts == TimeStatus.OVERDUE;
                })
                .collect(Collectors.toList());
    }
}
