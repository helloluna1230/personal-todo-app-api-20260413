package com.todo.application.service;

import com.todo.domain.model.Category;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TaskQueryService {

    private final TaskRepository taskRepository;

    public TaskQueryService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
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
        return taskRepository.findByStatusNotAndDueDateLessThanEqual(
                TaskStatus.DONE, LocalDate.now());
    }
}
