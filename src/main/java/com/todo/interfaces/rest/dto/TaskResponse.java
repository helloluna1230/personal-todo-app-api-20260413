package com.todo.interfaces.rest.dto;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class TaskResponse {

    private String id;
    private String title;
    private String note;
    private Category category;
    private Priority priority;
    private TaskStatus status;
    private LocalDate dueAt;
    private LocalDateTime remindAt;
    private String timezone;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long version;

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
        response.timezone = task.getTimezone();
        response.completedAt = task.getCompletedAt();
        response.createdAt = task.getCreatedAt();
        response.updatedAt = task.getUpdatedAt();
        response.version = task.getVersion();
        return response;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getNote() { return note; }
    public Category getCategory() { return category; }
    public Priority getPriority() { return priority; }
    public TaskStatus getStatus() { return status; }
    public LocalDate getDueAt() { return dueAt; }
    public LocalDateTime getRemindAt() { return remindAt; }
    public String getTimezone() { return timezone; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }
}
