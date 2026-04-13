package com.todo.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    private Instant dueAt;

    private Instant reminderAt;

    private String timezone;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Task() {}

    private Task(Builder builder) {
        this.id = builder.id;
        this.title = builder.title;
        this.notes = builder.notes;
        this.category = builder.category;
        this.priority = builder.priority;
        this.status = builder.status;
        this.dueAt = builder.dueAt;
        this.reminderAt = builder.reminderAt;
        this.timezone = builder.timezone;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static Builder builder() {
        return new Builder();
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

    public static class Builder {
        private String id = UUID.randomUUID().toString();
        private String title;
        private String notes;
        private Category category = Category.WORK;
        private Priority priority = Priority.MEDIUM;
        private TaskStatus status = TaskStatus.TODO;
        private Instant dueAt;
        private Instant reminderAt;
        private String timezone;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public Builder title(String title) { this.title = title; return this; }
        public Builder notes(String notes) { this.notes = notes; return this; }
        public Builder category(Category category) { this.category = category; return this; }
        public Builder priority(Priority priority) { this.priority = priority; return this; }
        public Builder status(TaskStatus status) { this.status = status; return this; }
        public Builder dueAt(Instant dueAt) { this.dueAt = dueAt; return this; }
        public Builder reminderAt(Instant reminderAt) { this.reminderAt = reminderAt; return this; }
        public Builder timezone(String timezone) { this.timezone = timezone; return this; }

        public Task build() {
            return new Task(this);
        }
    }
}
