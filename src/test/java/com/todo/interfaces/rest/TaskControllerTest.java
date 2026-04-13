package com.todo.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.todo.application.service.TaskCommandService;
import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.NoSuchElementException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TaskCommandService taskCommandService;

    // ---- POST /api/tasks ----

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
    void createTask_withHighPriority_shouldReturn201WithHighPriority() throws Exception {
        Task mockTask = Task.builder()
                .title("高优先级任务")
                .category(Category.WORK)
                .priority(Priority.HIGH)
                .build();

        when(taskCommandService.createTask(any(CreateTaskRequest.class))).thenReturn(mockTask);

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("高优先级任务");
        request.setPriority(Priority.HIGH);

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    @Test
    void createTask_withLowPriority_shouldReturn201WithLowPriority() throws Exception {
        Task mockTask = Task.builder()
                .title("低优先级任务")
                .category(Category.WORK)
                .priority(Priority.LOW)
                .build();

        when(taskCommandService.createTask(any(CreateTaskRequest.class))).thenReturn(mockTask);

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("低优先级任务");
        request.setPriority(Priority.LOW);

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.priority").value("LOW"));
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

    // ---- GET /api/tasks ----

    @Test
    void listTasks_shouldReturnAllTasksWithPriority() throws Exception {
        Task t1 = Task.builder().title("任务1").priority(Priority.HIGH).build();
        Task t2 = Task.builder().title("任务2").priority(Priority.LOW).build();
        when(taskCommandService.listTasks()).thenReturn(List.of(t1, t2));

        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].priority").value("HIGH"))
                .andExpect(jsonPath("$[1].priority").value("LOW"));
    }

    // ---- GET /api/tasks/{id} ----

    @Test
    void getTask_withValidId_shouldReturnTask() throws Exception {
        Task task = Task.builder().title("任务").priority(Priority.MEDIUM).build();
        when(taskCommandService.getTask(task.getId())).thenReturn(task);

        mockMvc.perform(get("/api/tasks/" + task.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("任务"))
                .andExpect(jsonPath("$.priority").value("MEDIUM"));
    }

    @Test
    void getTask_withInvalidId_shouldReturn404() throws Exception {
        when(taskCommandService.getTask("bad-id"))
                .thenThrow(new NoSuchElementException("任务不存在：bad-id"));

        mockMvc.perform(get("/api/tasks/bad-id"))
                .andExpect(status().isNotFound());
    }

    // ---- PATCH /api/tasks/{id}/priority ----

    @Test
    void updatePriority_withValidIdAndHigh_shouldReturn200() throws Exception {
        Task task = Task.builder().title("任务").priority(Priority.HIGH).build();
        when(taskCommandService.updatePriority(eq(task.getId()), any(UpdatePriorityRequest.class)))
                .thenReturn(task);

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        mockMvc.perform(patch("/api/tasks/" + task.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    @Test
    void updatePriority_withValidIdAndLow_shouldReturn200() throws Exception {
        Task task = Task.builder().title("任务").priority(Priority.LOW).build();
        when(taskCommandService.updatePriority(eq(task.getId()), any(UpdatePriorityRequest.class)))
                .thenReturn(task);

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.LOW);

        mockMvc.perform(patch("/api/tasks/" + task.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("LOW"));
    }

    @Test
    void updatePriority_withNullPriority_shouldReturn400() throws Exception {
        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(null);

        mockMvc.perform(patch("/api/tasks/some-id/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.priority").value("请选择优先级"));
    }

    @Test
    void updatePriority_withNonExistentId_shouldReturn404() throws Exception {
        when(taskCommandService.updatePriority(eq("bad-id"), any(UpdatePriorityRequest.class)))
                .thenThrow(new NoSuchElementException("任务不存在：bad-id"));

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        mockMvc.perform(patch("/api/tasks/bad-id/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }
}
