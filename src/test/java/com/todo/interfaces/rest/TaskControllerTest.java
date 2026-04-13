package com.todo.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TaskRepository taskRepository;

    private Task savedTask;

    @BeforeEach
    void setUp() {
        savedTask = taskRepository.save(Task.builder().title("测试任务").priority(Priority.MEDIUM).build());
    }

    @Test
    void updatePriority_toHigh_shouldReturn200AndPersist() throws Exception {
        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        mockMvc.perform(patch("/api/tasks/" + savedTask.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedTask.getId()))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.version").isNumber())
                .andExpect(jsonPath("$.timezone").doesNotExist());

        Task persisted = taskRepository.findById(savedTask.getId()).orElseThrow();
        assertThat(persisted.getPriority()).isEqualTo(Priority.HIGH);
    }

    @Test
    void updatePriority_toLow_shouldReturn200AndPersist() throws Exception {
        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.LOW);

        mockMvc.perform(patch("/api/tasks/" + savedTask.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("LOW"));

        Task persisted = taskRepository.findById(savedTask.getId()).orElseThrow();
        assertThat(persisted.getPriority()).isEqualTo(Priority.LOW);
    }

    @Test
    void updatePriority_toMedium_shouldReturn200AndPersist() throws Exception {
        Task highTask = taskRepository.save(Task.builder().title("高优先级任务").priority(Priority.HIGH).build());

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.MEDIUM);

        mockMvc.perform(patch("/api/tasks/" + highTask.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("MEDIUM"));

        Task persisted = taskRepository.findById(highTask.getId()).orElseThrow();
        assertThat(persisted.getPriority()).isEqualTo(Priority.MEDIUM);
    }

    @Test
    void updatePriority_withMissingPriority_shouldReturn400() throws Exception {
        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(null);

        mockMvc.perform(patch("/api/tasks/" + savedTask.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.priority").value("请选择优先级"));
    }

    @Test
    void updatePriority_withNonExistentId_shouldReturn404() throws Exception {
        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        mockMvc.perform(patch("/api/tasks/non-existent-id/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("任务不存在：non-existent-id"));
    }

    @Test
    void updatePriority_defaultPriorityOnNewTask_shouldBeMedium() throws Exception {
        Task freshTask = taskRepository.save(Task.builder().title("新任务").build());
        assertThat(freshTask.getPriority()).isEqualTo(Priority.MEDIUM);

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        mockMvc.perform(patch("/api/tasks/" + freshTask.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priority").value("HIGH"));
    }

    @Test
    void updatePriority_taskWithTimezone_shouldReturnTimezoneInResponse() throws Exception {
        Task taskWithTz = taskRepository.save(
                Task.builder().title("时区任务").timezone("Asia/Shanghai").build());

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        mockMvc.perform(patch("/api/tasks/" + taskWithTz.getId() + "/priority")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timezone").value("Asia/Shanghai"));

        Task persisted = taskRepository.findById(taskWithTz.getId()).orElseThrow();
        assertThat(persisted.getTimezone()).isEqualTo("Asia/Shanghai");
    }
}
