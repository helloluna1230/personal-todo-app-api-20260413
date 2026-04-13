package com.todo.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.application.service.TaskCommandService;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TaskCommandService taskCommandService;

    @Test
    void createTask_withValidRequest_shouldReturn201() throws Exception {
        Task mockTask = Task.builder()
                .title("买牛奶")
                .category(Category.WORK)
                .priority(Priority.MEDIUM)
                .build();

        when(taskCommandService.createTask(any(CreateTaskRequest.class))).thenReturn(mockTask);

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("买牛奶");

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("买牛奶"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.priority").value("MEDIUM"))
                .andExpect(jsonPath("$.category").value("WORK"))
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void createTask_withAllFields_shouldReturn201() throws Exception {
        Task mockTask = Task.builder()
                .title("完成报告")
                .notes("需要附上图表")
                .category(Category.PERSONAL)
                .priority(Priority.HIGH)
                .dueDate(LocalDate.of(2026, 5, 1))
                .reminderTime(LocalTime.of(9, 0))
                .build();

        when(taskCommandService.createTask(any(CreateTaskRequest.class))).thenReturn(mockTask);

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("完成报告");
        request.setNotes("需要附上图表");
        request.setCategory(Category.PERSONAL);
        request.setPriority(Priority.HIGH);
        request.setDueDate(LocalDate.of(2026, 5, 1));
        request.setReminderTime(LocalTime.of(9, 0));

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("完成报告"))
                .andExpect(jsonPath("$.notes").value("需要附上图表"))
                .andExpect(jsonPath("$.category").value("PERSONAL"))
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    @Test
    void createTask_withBlankTitle_shouldReturn400WithMessage() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("");

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("请输入待办标题"));
    }

    @Test
    void createTask_withNullTitle_shouldReturn400WithMessage() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("请输入待办标题"));
    }
}
