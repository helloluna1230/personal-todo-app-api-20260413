package com.todo.application.service;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TaskCommandServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TaskCommandService taskCommandService;

    private void stubSave() {
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createTask_withValidTitle_shouldReturnSavedTask() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("买牛奶");

        Task task = taskCommandService.createTask(request);

        assertThat(task.getTitle()).isEqualTo("买牛奶");
        assertThat(task.getStatus()).isEqualTo(TaskStatus.TODO);
        assertThat(task.getPriority()).isEqualTo(Priority.MEDIUM);
        assertThat(task.getCategory()).isEqualTo(Category.WORK);
        assertThat(task.getId()).isNotNull();
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void createTask_withAllFields_shouldPersistCorrectly() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("完成报告");
        request.setNote("需要附上图表");
        request.setCategory(Category.LIFE);
        request.setPriority(Priority.HIGH);
        request.setDueAt(LocalDate.of(2026, 5, 1));
        request.setRemindAt(LocalTime.of(9, 0));

        Task task = taskCommandService.createTask(request);

        assertThat(task.getTitle()).isEqualTo("完成报告");
        assertThat(task.getNote()).isEqualTo("需要附上图表");
        assertThat(task.getCategory()).isEqualTo(Category.LIFE);
        assertThat(task.getPriority()).isEqualTo(Priority.HIGH);
        assertThat(task.getDueAt()).isEqualTo(LocalDate.of(2026, 5, 1));
        assertThat(task.getRemindAt()).isEqualTo(LocalTime.of(9, 0));
        assertThat(task.getStatus()).isEqualTo(TaskStatus.TODO);
    }

    @Test
    void createTask_withNullTitle_shouldThrowException() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle(null);

        assertThatThrownBy(() -> taskCommandService.createTask(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("请输入待办标题");
    }

    @Test
    void createTask_withBlankTitle_shouldThrowException() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("   ");

        assertThatThrownBy(() -> taskCommandService.createTask(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("请输入待办标题");
    }

    @Test
    void createTask_withEmptyTitle_shouldThrowException() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("");

        assertThatThrownBy(() -> taskCommandService.createTask(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("请输入待办标题");
    }

    @Test
    void createTask_withTitleExceeding120Chars_shouldThrowException() {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("a".repeat(121));

        assertThatThrownBy(() -> taskCommandService.createTask(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("待办标题不能超过120个字符");
    }

    @Test
    void createTask_withTitleExactly120Chars_shouldSucceed() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("a".repeat(120));

        Task task = taskCommandService.createTask(request);

        assertThat(task.getTitle()).hasSize(120);
    }

    @Test
    void createTask_withNullCategory_shouldDefaultToWork() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("任务");
        request.setCategory(null);

        Task task = taskCommandService.createTask(request);

        assertThat(task.getCategory()).isEqualTo(Category.WORK);
    }

    @Test
    void createTask_withNullPriority_shouldDefaultToMedium() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("任务");
        request.setPriority(null);

        Task task = taskCommandService.createTask(request);

        assertThat(task.getPriority()).isEqualTo(Priority.MEDIUM);
    }

    @Test
    void createTask_titleShouldBeTrimmed() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("  买菜  ");

        Task task = taskCommandService.createTask(request);

        assertThat(task.getTitle()).isEqualTo("买菜");
    }

    @Test
    void createTask_titleLength120AfterTrim_shouldSucceed() {
        stubSave();
        String paddedTitle = "  " + "a".repeat(120) + "  ";
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle(paddedTitle);

        Task task = taskCommandService.createTask(request);

        assertThat(task.getTitle()).hasSize(120);
    }
}
