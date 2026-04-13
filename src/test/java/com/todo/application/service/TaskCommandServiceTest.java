package com.todo.application.service;

import com.todo.domain.model.Category;
import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.CreateTaskRequest;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.NoSuchElementException;
import java.util.Optional;

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

    // ---- createTask tests ----

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
        request.setNotes("需要附上图表");
        request.setCategory(Category.PERSONAL);
        request.setPriority(Priority.HIGH);
        request.setDueDate(LocalDate.of(2026, 5, 1));
        request.setReminderTime(LocalTime.of(9, 0));

        Task task = taskCommandService.createTask(request);

        assertThat(task.getTitle()).isEqualTo("完成报告");
        assertThat(task.getNotes()).isEqualTo("需要附上图表");
        assertThat(task.getCategory()).isEqualTo(Category.PERSONAL);
        assertThat(task.getPriority()).isEqualTo(Priority.HIGH);
        assertThat(task.getDueDate()).isEqualTo(LocalDate.of(2026, 5, 1));
        assertThat(task.getReminderTime()).isEqualTo(LocalTime.of(9, 0));
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
    void createTask_withNullPriority_shouldDefaultToMedium() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("任务");
        request.setPriority(null);

        Task task = taskCommandService.createTask(request);

        assertThat(task.getPriority()).isEqualTo(Priority.MEDIUM);
    }

    @Test
    void createTask_withLowPriority_shouldPersistLow() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("低优先级任务");
        request.setPriority(Priority.LOW);

        Task task = taskCommandService.createTask(request);

        assertThat(task.getPriority()).isEqualTo(Priority.LOW);
    }

    @Test
    void createTask_withHighPriority_shouldPersistHigh() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("高优先级任务");
        request.setPriority(Priority.HIGH);

        Task task = taskCommandService.createTask(request);

        assertThat(task.getPriority()).isEqualTo(Priority.HIGH);
    }

    @Test
    void createTask_titleShouldBeTrimmed() {
        stubSave();
        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("  买菜  ");

        Task task = taskCommandService.createTask(request);

        assertThat(task.getTitle()).isEqualTo("买菜");
    }

    // ---- updatePriority tests ----

    @Test
    void updatePriority_withValidIdAndHigh_shouldUpdatePriority() {
        Task existingTask = Task.builder().title("任务").priority(Priority.MEDIUM).build();
        when(taskRepository.findById(existingTask.getId())).thenReturn(Optional.of(existingTask));
        stubSave();

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        Task updated = taskCommandService.updatePriority(existingTask.getId(), request);

        assertThat(updated.getPriority()).isEqualTo(Priority.HIGH);
        verify(taskRepository).save(existingTask);
    }

    @Test
    void updatePriority_withValidIdAndLow_shouldUpdatePriority() {
        Task existingTask = Task.builder().title("任务").priority(Priority.HIGH).build();
        when(taskRepository.findById(existingTask.getId())).thenReturn(Optional.of(existingTask));
        stubSave();

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.LOW);

        Task updated = taskCommandService.updatePriority(existingTask.getId(), request);

        assertThat(updated.getPriority()).isEqualTo(Priority.LOW);
    }

    @Test
    void updatePriority_withMediumPriority_shouldUpdatePriority() {
        Task existingTask = Task.builder().title("任务").priority(Priority.HIGH).build();
        when(taskRepository.findById(existingTask.getId())).thenReturn(Optional.of(existingTask));
        stubSave();

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.MEDIUM);

        Task updated = taskCommandService.updatePriority(existingTask.getId(), request);

        assertThat(updated.getPriority()).isEqualTo(Priority.MEDIUM);
    }

    @Test
    void updatePriority_withNonExistentId_shouldThrowNoSuchElementException() {
        when(taskRepository.findById("non-existent")).thenReturn(Optional.empty());

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        assertThatThrownBy(() -> taskCommandService.updatePriority("non-existent", request))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("任务不存在");
    }

    @Test
    void updatePriority_shouldRefreshUpdatedAt() {
        Task existingTask = Task.builder().title("任务").build();
        when(taskRepository.findById(existingTask.getId())).thenReturn(Optional.of(existingTask));
        stubSave();

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.HIGH);

        taskCommandService.updatePriority(existingTask.getId(), request);

        assertThat(existingTask.getUpdatedAt()).isNotNull();
    }
}
