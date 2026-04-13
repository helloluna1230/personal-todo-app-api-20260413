package com.todo.interfaces.rest.dto;

import com.todo.application.service.TimeStatusService;
import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;

import java.time.Instant;
import java.time.LocalDateTime;

public class TaskResponse {

    private String id;
    private String title;
    private String notes;
    private Category category;
    private Priority priority;
    private TaskStatus status;
    private Instant dueAt;
    private Instant reminderAt;
    private String timezone;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private TimeStatus timeStatus;

    public static TaskResponse from(Task task, TimeStatusService timeStatusService) {
        TaskResponse response = new TaskResponse();
        response.id = task.getId();
        response.title = task.getTitle();
        response.notes = task.getNotes();
        response.category = task.getCategory();
        response.priority = task.getPriority();
        response.status = task.getStatus();
        response.dueAt = task.getDueAt();
        response.reminderAt = task.getReminderAt();
        response.timezone = task.getTimezone();
        response.createdAt = task.getCreatedAt();
        response.updatedAt = task.getUpdatedAt();
        response.timeStatus = timeStatusService.computeTimeStatus(task);
        return response;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getNotes() { return notes; }
    public Category getCategory() { return category; }
    public Priority getPriority() { return priority; }
    public TaskStatus getStatus() { return status; }
    public Instant getDueAt() { return dueAt; }
    public Instant getReminderAt() { return reminderAt; }
    public String getTimezone() { return timezone; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public TimeStatus getTimeStatus() { return timeStatus; }
}
