package com.todo.interfaces.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.todo.application.service.TaskCommandService;
import com.todo.application.service.TaskQueryService;
import com.todo.application.service.TimeStatusService;
import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

    @MockBean
    private TaskQueryService taskQueryService;

    @MockBean
    private TimeStatusService timeStatusService;

    @Test
    void createTask_withValidRequest_shouldReturn201() throws Exception {
        Task mockTask = Task.builder()
                .title("买牛奶")
                .category(Category.WORK)
                .priority(Priority.MEDIUM)
                .build();

        when(taskCommandService.createTask(any(CreateTaskRequest.class))).thenReturn(mockTask);
        when(timeStatusService.computeTimeStatus(mockTask)).thenReturn(TimeStatus.NO_DUE_DATE);

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
        when(timeStatusService.computeTimeStatus(mockTask)).thenReturn(TimeStatus.UPCOMING);

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
                .andExpect(status().isBadRequest());
    }

    @Test
    void listTasks_defaultView_shouldReturnAllTasks() throws Exception {
        Task task1 = Task.builder().title("任务1").category(Category.WORK).build();
        Task task2 = Task.builder().title("任务2").category(Category.PERSONAL).build();
        when(taskQueryService.getAll()).thenReturn(Arrays.asList(task1, task2));
        when(timeStatusService.computeTimeStatus(any())).thenReturn(TimeStatus.NO_DUE_DATE);

        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void listTasks_viewAll_shouldReturnAllTasks() throws Exception {
        Task task1 = Task.builder().title("任务1").category(Category.WORK).build();
        when(taskQueryService.getAll()).thenReturn(Collections.singletonList(task1));
        when(timeStatusService.computeTimeStatus(task1)).thenReturn(TimeStatus.NO_DUE_DATE);

        mockMvc.perform(get("/api/tasks").param("view", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("任务1"));
    }

    @Test
    void listTasks_viewAll_whenEmpty_shouldReturnEmptyList() throws Exception {
        when(taskQueryService.getAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/tasks").param("view", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listTasks_viewCategory_shouldReturnOnlyMatchingTasks() throws Exception {
        Task workTask = Task.builder().title("工作任务").category(Category.WORK).build();
        when(taskQueryService.getByCategory(Category.WORK))
                .thenReturn(Collections.singletonList(workTask));
        when(timeStatusService.computeTimeStatus(workTask)).thenReturn(TimeStatus.NO_DUE_DATE);

        mockMvc.perform(get("/api/tasks")
                        .param("view", "category")
                        .param("category", "WORK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].category").value("WORK"));
    }

    @Test
    void listTasks_viewCategory_whenEmpty_shouldReturnEmptyList() throws Exception {
        when(taskQueryService.getByCategory(Category.SHOPPING))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/tasks")
                        .param("view", "category")
                        .param("category", "SHOPPING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listTasks_viewCategory_withoutCategory_shouldReturn400() throws Exception {
        mockMvc.perform(get("/api/tasks").param("view", "category"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listTasks_viewToday_shouldReturnIncompleteTasksDueTodayOrOverdue() throws Exception {
        Task overdueTask = Task.builder().title("逾期任务")
                .dueDate(LocalDate.now().minusDays(1)).build();
        Task todayTask = Task.builder().title("今日任务")
                .dueDate(LocalDate.now()).build();
        when(taskQueryService.getToday()).thenReturn(Arrays.asList(overdueTask, todayTask));
        when(timeStatusService.computeTimeStatus(overdueTask)).thenReturn(TimeStatus.OVERDUE);
        when(timeStatusService.computeTimeStatus(todayTask)).thenReturn(TimeStatus.TODAY);

        mockMvc.perform(get("/api/tasks").param("view", "today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].timeStatus").value("OVERDUE"))
                .andExpect(jsonPath("$[1].timeStatus").value("TODAY"));
    }

    @Test
    void listTasks_viewToday_whenEmpty_shouldReturnEmptyList() throws Exception {
        when(taskQueryService.getToday()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/tasks").param("view", "today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listTasks_invalidView_shouldReturn400() throws Exception {
        mockMvc.perform(get("/api/tasks").param("view", "invalid"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listTasks_response_doneTask_shouldHaveDoneTimeStatus() throws Exception {
        Task doneTask = Task.builder().title("已完成任务")
                .status(TaskStatus.DONE)
                .dueDate(LocalDate.now().minusDays(1)).build();
        when(taskQueryService.getAll()).thenReturn(Collections.singletonList(doneTask));
        when(timeStatusService.computeTimeStatus(doneTask)).thenReturn(TimeStatus.DONE);

        mockMvc.perform(get("/api/tasks").param("view", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].timeStatus").value("DONE"));
    }

    @Test
    void listTasks_response_noDueDateTask_shouldHaveNoDueDateTimeStatus() throws Exception {
        Task noDueTask = Task.builder().title("无截止日任务").build();
        when(taskQueryService.getAll()).thenReturn(Collections.singletonList(noDueTask));
        when(timeStatusService.computeTimeStatus(noDueTask)).thenReturn(TimeStatus.NO_DUE_DATE);

        mockMvc.perform(get("/api/tasks").param("view", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].timeStatus").value("NO_DUE_DATE"));
    }

    @Test
    void listTasks_response_futureTask_shouldHaveUpcomingTimeStatus() throws Exception {
        Task futureTask = Task.builder().title("未来任务")
                .dueDate(LocalDate.now().plusDays(3)).build();
        when(taskQueryService.getAll()).thenReturn(Collections.singletonList(futureTask));
        when(timeStatusService.computeTimeStatus(futureTask)).thenReturn(TimeStatus.UPCOMING);

        mockMvc.perform(get("/api/tasks").param("view", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].timeStatus").value("UPCOMING"));
    }
}
