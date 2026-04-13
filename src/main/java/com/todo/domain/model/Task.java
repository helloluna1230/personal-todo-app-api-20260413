package com.todo.domain.model;

import jakarta.persistence.*;
import java.time.LocalDate;
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

    private LocalDate dueAt;

    private LocalDateTime remindAt;

    /**
     * IANA timezone identifier for the user's local context (e.g., "Asia/Shanghai", "America/New_York").
     * Used for natural-day semantics on {@code dueAt} and for cross-timezone reminder recalculation.
     */
    private String timezone;

    private LocalDateTime completedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version;

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
        this.timezone = builder.timezone;
        this.completedAt = builder.completedAt;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
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
    public LocalDate getDueAt() { return dueAt; }
    public LocalDateTime getRemindAt() { return remindAt; }
    public String getTimezone() { return timezone; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Long getVersion() { return version; }

    public static class Builder {
        private String id = UUID.randomUUID().toString();
        private String title;
        private String note;
        private Category category = Category.WORK;
        private Priority priority = Priority.MEDIUM;
        private TaskStatus status = TaskStatus.TODO;
        private LocalDate dueAt;
        private LocalDateTime remindAt;
        private String timezone;
        private LocalDateTime completedAt;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public Builder title(String title) { this.title = title; return this; }
        public Builder note(String note) { this.note = note; return this; }
        public Builder category(Category category) { this.category = category; return this; }
        public Builder priority(Priority priority) { this.priority = priority; return this; }
        public Builder status(TaskStatus status) { this.status = status; return this; }
        public Builder dueAt(LocalDate dueAt) { this.dueAt = dueAt; return this; }
        public Builder remindAt(LocalDateTime remindAt) { this.remindAt = remindAt; return this; }
        public Builder timezone(String timezone) { this.timezone = timezone; return this; }
        public Builder completedAt(LocalDateTime completedAt) { this.completedAt = completedAt; return this; }

        public Task build() {
            return new Task(this);
        }
    }
}
