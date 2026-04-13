package com.todo.interfaces.rest.dto;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.time.LocalTime;

public class CreateTaskRequest {

    @NotBlank(message = "请输入待办标题")
    private String title;

    private String notes;

    private Category category;

    private Priority priority;

    private LocalDate dueDate;

    private LocalTime reminderTime;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public LocalTime getReminderTime() { return reminderTime; }
    public void setReminderTime(LocalTime reminderTime) { this.reminderTime = reminderTime; }
}
