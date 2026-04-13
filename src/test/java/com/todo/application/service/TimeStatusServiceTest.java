package com.todo.application.service;

import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class TimeStatusServiceTest {

    private final TimeStatusService timeStatusService = new TimeStatusService();

    @Test
    void computeTimeStatus_doneTask_shouldReturnDone() {
        Instant yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Task task = Task.builder().title("已完成")
                .status(TaskStatus.DONE)
                .dueAt(yesterday)
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.DONE);
    }

    @Test
    void computeTimeStatus_doneTaskWithNoDueDate_shouldReturnDone() {
        Task task = Task.builder().title("已完成无截止日")
                .status(TaskStatus.DONE)
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.DONE);
    }

    @Test
    void computeTimeStatus_noDueDate_shouldReturnNoDueDate() {
        Task task = Task.builder().title("无截止日").build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.NO_DUE_DATE);
    }

    @Test
    void computeTimeStatus_dueDateBeforeToday_shouldReturnOverdue() {
        Instant yesterday = LocalDate.now(ZoneOffset.UTC).minusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Task task = Task.builder().title("逾期")
                .dueAt(yesterday)
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.OVERDUE);
    }

    @Test
    void computeTimeStatus_dueDateToday_shouldReturnToday() {
        Instant today = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        Task task = Task.builder().title("今日到期")
                .dueAt(today)
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.TODAY);
    }

    @Test
    void computeTimeStatus_dueDateAfterToday_shouldReturnUpcoming() {
        Instant tomorrow = LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Task task = Task.builder().title("未来任务")
                .dueAt(tomorrow)
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.UPCOMING);
    }
}
