package com.todo.application.service;

import com.todo.domain.model.Priority;
import com.todo.domain.model.Task;
import com.todo.domain.repository.TaskRepository;
import com.todo.interfaces.rest.dto.UpdatePriorityRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskCommandServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TaskCommandService taskCommandService;

    private void stubSave() {
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void updatePriority_toHigh_shouldPersistHigh() {
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
    void updatePriority_toLow_shouldPersistLow() {
        Task existingTask = Task.builder().title("任务").priority(Priority.HIGH).build();
        when(taskRepository.findById(existingTask.getId())).thenReturn(Optional.of(existingTask));
        stubSave();

        UpdatePriorityRequest request = new UpdatePriorityRequest();
        request.setPriority(Priority.LOW);

        Task updated = taskCommandService.updatePriority(existingTask.getId(), request);

        assertThat(updated.getPriority()).isEqualTo(Priority.LOW);
    }

    @Test
    void updatePriority_toMedium_shouldPersistMedium() {
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

    @Test
    void taskBuilder_withValidTimezone_shouldAcceptIt() {
        Task task = Task.builder().title("任务").timezone("Asia/Shanghai").build();
        assertThat(task.getTimezone()).isEqualTo("Asia/Shanghai");
    }

    @Test
    void taskBuilder_withInvalidTimezone_shouldThrowIllegalArgumentException() {
        assertThatThrownBy(() -> Task.builder().title("任务").timezone("Invalid/Timezone").build())
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("无效的时区标识符");
    }

    @Test
    void taskBuilder_withNullTimezone_shouldAllowNull() {
        Task task = Task.builder().title("任务").timezone(null).build();
        assertThat(task.getTimezone()).isNull();
    }
}
