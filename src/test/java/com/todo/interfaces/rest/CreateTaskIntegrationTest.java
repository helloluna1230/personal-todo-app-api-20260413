package com.todo.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CreateTaskIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TaskRepository taskRepository;

    @AfterEach
    void cleanup() {
        taskRepository.deleteAll();
    }

    @Test
    void createTask_persistsToDatabase() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("集成测试任务");

        MvcResult result = mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.title").value("集成测试任务"))
                .andExpect(jsonPath("$.status").value("TODO"))
                .andExpect(jsonPath("$.priority").value("MEDIUM"))
                .andExpect(jsonPath("$.category").value("WORK"))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        String id = objectMapper.readTree(responseBody).get("id").asText();

        assertThat(taskRepository.findById(id)).isPresent().hasValueSatisfying(task -> {
            assertThat(task.getTitle()).isEqualTo("集成测试任务");
            assertThat(task.getStatus()).isEqualTo(TaskStatus.TODO);
            assertThat(task.getPriority()).isEqualTo(Priority.MEDIUM);
            assertThat(task.getCategory()).isEqualTo(Category.WORK);
        });
    }

    @Test
    void createTask_withAllOptionalFields_persistsToDatabase() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("完成季度汇报");
        request.setNote("需要数据支撑");
        request.setCategory(Category.STUDY);
        request.setPriority(Priority.HIGH);
        request.setDueAt(LocalDate.of(2026, 5, 31));
        request.setRemindAt(LocalDateTime.of(2026, 5, 31, 8, 30));
        request.setTimezone("Asia/Shanghai");

        MvcResult result = mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        String id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        assertThat(taskRepository.findById(id)).isPresent().hasValueSatisfying(task -> {
            assertThat(task.getNote()).isEqualTo("需要数据支撑");
            assertThat(task.getCategory()).isEqualTo(Category.STUDY);
            assertThat(task.getPriority()).isEqualTo(Priority.HIGH);
            assertThat(task.getDueAt()).isEqualTo(LocalDateTime.of(2026, 5, 31, 23, 59, 59, 999_000_000));
            assertThat(task.getRemindAt()).isEqualTo(LocalDateTime.of(2026, 5, 31, 8, 30));
            assertThat(task.getTimezone()).isEqualTo("Asia/Shanghai");
            assertThat(task.getCompletedAt()).isNull();
            assertThat(task.getVersion()).isNotNull();
        });
    }

    @Test
    void createTask_withBlankTitle_returns400_andNothingPersisted() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("   ");

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("请输入待办标题"));

        assertThat(taskRepository.count()).isZero();
    }

    @Test
    void createTask_withTitleOver120Chars_returns400_andNothingPersisted() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("a".repeat(121));

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        assertThat(taskRepository.count()).isZero();
    }

    @Test
    void createTask_withRemindAtAfterDueAt_returns400_andNothingPersisted() throws Exception {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("任务");
        request.setDueAt(LocalDate.of(2026, 5, 1));
        request.setRemindAt(LocalDateTime.of(2026, 5, 2, 9, 0));

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("提醒时间不能晚于截止时间"));

        assertThat(taskRepository.count()).isZero();
    }
}
