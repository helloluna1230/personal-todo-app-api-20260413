package com.todo.application.service;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class TaskCommandService {

    private final TaskRepository taskRepository;

    public TaskCommandService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public Task createTask(CreateTaskRequest request) {
        if (!StringUtils.hasText(request.getTitle())) {
            throw new IllegalArgumentException("请输入待办标题");
        }

        Category category = request.getCategory() != null ? request.getCategory() : Category.WORK;
        Priority priority = request.getPriority() != null ? request.getPriority() : Priority.MEDIUM;

        Task task = Task.builder()
                .title(request.getTitle().trim())
                .notes(request.getNotes())
                .category(category)
                .priority(priority)
                .dueDate(request.getDueDate())
                .reminderTime(request.getReminderTime())
                .build();

        return taskRepository.save(task);
    }

    @Transactional
    public Task updatePriority(String taskId, UpdatePriorityRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在：" + taskId));

        Priority priority = request.getPriority() != null ? request.getPriority() : Priority.MEDIUM;
        task.setPriority(priority);
        task.setUpdatedAt(LocalDateTime.now());

        return taskRepository.save(task);
    }

    @Transactional(readOnly = true)
    public List<Task> listTasks() {
        return taskRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Task getTask(String taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在：" + taskId));
    }
}
