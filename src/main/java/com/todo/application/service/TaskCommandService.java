package com.todo.application.service;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

@Service
public class TaskCommandService {

    private static final int TITLE_MAX_LENGTH = 120;

    private final TaskRepository taskRepository;

    public TaskCommandService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public Task createTask(CreateTaskRequest request) {
        String rawTitle = request.getTitle();
        if (!StringUtils.hasText(rawTitle)) {
            throw new IllegalArgumentException("请输入待办标题");
        }
        String title = rawTitle.trim();
        if (title.length() > TITLE_MAX_LENGTH) {
            throw new IllegalArgumentException("待办标题不能超过120个字符");
        }

        Category category = request.getCategory() != null ? request.getCategory() : Category.WORK;
        Priority priority = request.getPriority() != null ? request.getPriority() : Priority.MEDIUM;

        String timezone = request.getTimezone();
        if (StringUtils.hasText(timezone)) {
            try {
                ZoneId.of(timezone);
            } catch (Exception e) {
                throw new IllegalArgumentException("无效的时区标识符: " + timezone);
            }
        }

        LocalDateTime dueAt = normalizeDueAt(request.getDueAt());
        LocalDateTime remindAt = request.getRemindAt();

        if (dueAt != null && remindAt != null && remindAt.isAfter(dueAt)) {
            throw new IllegalArgumentException("提醒时间不能晚于截止时间");
        }

        Task task = Task.builder()
                .title(title)
                .note(request.getNote())
                .category(category)
                .priority(priority)
                .dueAt(dueAt)
                .remindAt(remindAt)
                .timezone(request.getTimezone())
                .build();

        return taskRepository.save(task);
    }

    /**
     * Normalizes a date-only input to the end of that day (23:59:59.999), so that
     * {@code dueAt} always stores a precise datetime point for consistent
     * TODAY/OVERDUE projections across timezones.
     */
    private static LocalDateTime normalizeDueAt(LocalDate dueDate) {
        if (dueDate == null) {
            return null;
        }
        return LocalDateTime.of(dueDate, LocalTime.of(23, 59, 59, 999_000_000));
    }
}
