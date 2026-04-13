package com.todo.domain.model;

import jakarta.persistence.*;
import java.time.DateTimeException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status;

    private LocalDateTime dueAt;

    private LocalDateTime remindAt;

    private LocalDateTime completedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    private String timezone;

    protected Task() {}

    private Task(Builder builder) {
        this.id = builder.id;
        this.title = builder.title;
        this.note = builder.note;
        this.category = builder.category;
        this.priority = builder.priority;
        this.status = builder.status;
        this.dueAt = builder.dueAt;
        this.remindAt = builder.remindAt;
        this.completedAt = builder.completedAt;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
        this.timezone = builder.timezone;
    }

    public static Builder builder() {
        return new Builder();
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

    public void setPriority(Priority priority) { this.priority = priority; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static class Builder {
        private String id = UUID.randomUUID().toString();
        private String title;
        private String note;
        private Category category = Category.WORK;
        private Priority priority = Priority.MEDIUM;
        private TaskStatus status = TaskStatus.TODO;
        private LocalDateTime dueAt;
        private LocalDateTime remindAt;
        private LocalDateTime completedAt;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();
        private String timezone;

        public Builder title(String title) { this.title = title; return this; }
        public Builder note(String note) { this.note = note; return this; }
        public Builder category(Category category) { this.category = category; return this; }
        public Builder priority(Priority priority) { this.priority = priority; return this; }
        public Builder status(TaskStatus status) { this.status = status; return this; }
        public Builder dueAt(LocalDateTime dueAt) { this.dueAt = dueAt; return this; }
        public Builder remindAt(LocalDateTime remindAt) { this.remindAt = remindAt; return this; }
        public Builder completedAt(LocalDateTime completedAt) { this.completedAt = completedAt; return this; }
        public Builder timezone(String timezone) {
            if (timezone != null) {
                try {
                    ZoneId.of(timezone);
                } catch (DateTimeException e) {
                    throw new IllegalArgumentException("无效的时区标识符：" + timezone, e);
                }
            }
            this.timezone = timezone;
            return this;
        }

        public Task build() {
            return new Task(this);
        }
    }
}
