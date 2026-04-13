package com.todo.domain.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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

    private LocalDate dueDate;

    private LocalTime reminderTime;

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
        this.dueDate = builder.dueDate;
        this.reminderTime = builder.reminderTime;
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
    public LocalDate getDueDate() { return dueDate; }
    public LocalTime getReminderTime() { return reminderTime; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setPriority(Priority priority) { this.priority = priority; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static class Builder {
        private String id = UUID.randomUUID().toString();
        private String title;
        private String notes;
        private Category category = Category.WORK;
        private Priority priority = Priority.MEDIUM;
        private TaskStatus status = TaskStatus.TODO;
        private LocalDate dueDate;
        private LocalTime reminderTime;
        private LocalDateTime createdAt = LocalDateTime.now();
        private LocalDateTime updatedAt = LocalDateTime.now();

        public Builder title(String title) { this.title = title; return this; }
        public Builder notes(String notes) { this.notes = notes; return this; }
        public Builder category(Category category) { this.category = category; return this; }
        public Builder priority(Priority priority) { this.priority = priority; return this; }
        public Builder status(TaskStatus status) { this.status = status; return this; }
        public Builder dueDate(LocalDate dueDate) { this.dueDate = dueDate; return this; }
        public Builder reminderTime(LocalTime reminderTime) { this.reminderTime = reminderTime; return this; }

        public Task build() {
            return new Task(this);
        }
    }
}
