package com.todo.interfaces.rest.dto;

import com.todo.domain.model.Priority;
import jakarta.validation.constraints.NotNull;

public class UpdatePriorityRequest {

    @NotNull(message = "请选择优先级")
    private Priority priority;

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }
}
