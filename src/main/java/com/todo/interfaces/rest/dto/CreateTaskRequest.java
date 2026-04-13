package com.todo.interfaces.rest.dto;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public class CreateTaskRequest {

    @NotBlank(message = "请输入待办标题")
    @Size(max = 120, message = "待办标题不能超过120个字符")
    private String title;

    private String note;

    private Category category;

    private Priority priority;

    private LocalDate dueAt;

    private LocalTime remindAt;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public LocalDate getDueAt() { return dueAt; }
    public void setDueAt(LocalDate dueAt) { this.dueAt = dueAt; }

    public LocalTime getRemindAt() { return remindAt; }
    public void setRemindAt(LocalTime remindAt) { this.remindAt = remindAt; }
}
