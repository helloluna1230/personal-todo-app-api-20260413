package com.todo.interfaces.rest.dto;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;

import java.time.LocalDateTime;

public class TaskResponse {

    private String id;
    private String title;
    private String note;
    private Category category;
    private Priority priority;
    private TaskStatus status;
    private LocalDateTime dueAt;
    private LocalDateTime remindAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;
    private String timezone;

    public static TaskResponse from(Task task) {
        TaskResponse response = new TaskResponse();
        response.id = task.getId();
        response.title = task.getTitle();
        response.note = task.getNote();
        response.category = task.getCategory();
        response.priority = task.getPriority();
        response.status = task.getStatus();
        response.dueAt = task.getDueAt();
        response.remindAt = task.getRemindAt();
        response.completedAt = task.getCompletedAt();
        response.createdAt = task.getCreatedAt();
        response.updatedAt = task.getUpdatedAt();
        response.version = task.getVersion();
        response.timezone = task.getTimezone();
        return response;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getNote() { return note; }
    public Category getCategory() { return category; }
    public Priority getPriority() { return priority; }
    public TaskStatus getStatus() { return status; }
    public LocalDateTime getDueAt() { return dueAt; }
    public LocalDateTime getRemindAt() { return remindAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
    public String getTimezone() { return timezone; }
}
