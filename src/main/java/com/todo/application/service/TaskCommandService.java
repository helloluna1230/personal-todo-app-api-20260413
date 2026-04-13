package com.todo.application.service;

import com.todo.domain.model.Task;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;

@Service
public class TaskCommandService {

    private final TaskRepository taskRepository;

    public TaskCommandService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public Task updatePriority(String taskId, UpdatePriorityRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在：" + taskId));

        task.setPriority(request.getPriority());
        task.setUpdatedAt(LocalDateTime.now());

        return taskRepository.save(task);
    }
}
