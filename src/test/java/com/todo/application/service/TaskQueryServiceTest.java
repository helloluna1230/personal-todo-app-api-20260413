package com.todo.application.service;

import com.todo.domain.model.Category;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskQueryServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TaskQueryService taskQueryService;

    @Test
    void getAll_shouldReturnAllTasks() {
        Task task1 = Task.builder().title("任务1").build();
        Task task2 = Task.builder().title("任务2").build();
        when(taskRepository.findAll()).thenReturn(Arrays.asList(task1, task2));

        List<Task> result = taskQueryService.getAll();

        assertThat(result).hasSize(2);
        verify(taskRepository).findAll();
    }

    @Test
    void getAll_whenEmpty_shouldReturnEmptyList() {
        when(taskRepository.findAll()).thenReturn(Collections.emptyList());

        List<Task> result = taskQueryService.getAll();

        assertThat(result).isEmpty();
    }

    @Test
    void getByCategory_shouldReturnMatchingTasks() {
        Task workTask = Task.builder().title("工作任务").category(Category.WORK).build();
        when(taskRepository.findByCategory(Category.WORK)).thenReturn(Collections.singletonList(workTask));

        List<Task> result = taskQueryService.getByCategory(Category.WORK);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCategory()).isEqualTo(Category.WORK);
        verify(taskRepository).findByCategory(Category.WORK);
    }

    @Test
    void getByCategory_whenEmpty_shouldReturnEmptyList() {
        when(taskRepository.findByCategory(Category.SHOPPING)).thenReturn(Collections.emptyList());

        List<Task> result = taskQueryService.getByCategory(Category.SHOPPING);

        assertThat(result).isEmpty();
    }

    @Test
    void getToday_shouldReturnIncompleteTasksDueTodayOrOverdue() {
        Task overdueTask = Task.builder().title("逾期任务")
                .dueDate(LocalDate.now().minusDays(1)).build();
        Task todayTask = Task.builder().title("今日任务")
                .dueDate(LocalDate.now()).build();
        when(taskRepository.findByStatusNotAndDueDateLessThanEqual(
                eq(TaskStatus.DONE), any(LocalDate.class)))
                .thenReturn(Arrays.asList(overdueTask, todayTask));

        List<Task> result = taskQueryService.getToday();

        assertThat(result).hasSize(2);
        verify(taskRepository).findByStatusNotAndDueDateLessThanEqual(
                eq(TaskStatus.DONE), any(LocalDate.class));
    }

    @Test
    void getToday_whenEmpty_shouldReturnEmptyList() {
        when(taskRepository.findByStatusNotAndDueDateLessThanEqual(
                eq(TaskStatus.DONE), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        List<Task> result = taskQueryService.getToday();

        assertThat(result).isEmpty();
    }
}
