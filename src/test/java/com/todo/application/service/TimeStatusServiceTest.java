package com.todo.application.service;

import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class TimeStatusServiceTest {

    // Fixed "now" = 2026-04-13T12:00:00Z  (noon UTC)
    private static final Instant NOW = Instant.parse("2026-04-13T12:00:00Z");
    private static final Clock FIXED_CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private final TimeStatusService timeStatusService = new TimeStatusService(FIXED_CLOCK);

    @Test
    void computeTimeStatus_doneTask_shouldReturnDone() {
        Task task = Task.builder().title("已完成")
                .status(TaskStatus.DONE)
                .dueAt(Instant.parse("2026-04-12T00:00:00Z"))
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
        // Due yesterday — clearly overdue
        Task task = Task.builder().title("昨日逾期")
                .dueAt(Instant.parse("2026-04-12T23:59:59Z"))
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.OVERDUE);
    }

    @Test
    void computeTimeStatus_dueDateTodayButAlreadyPast_shouldReturnOverdue() {
        // Due 09:00 today UTC — it is now 12:00, so the deadline has passed
        Task task = Task.builder().title("今天早些时候逾期")
                .dueAt(Instant.parse("2026-04-13T09:00:00Z"))
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.OVERDUE);
    }

    @Test
    void computeTimeStatus_dueDateTodayAndStillFuture_shouldReturnToday() {
        // Due 18:00 today UTC — deadline has not passed yet (now is 12:00)
        Task task = Task.builder().title("今日到期（未来）")
                .dueAt(Instant.parse("2026-04-13T18:00:00Z"))
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.TODAY);
    }

    @Test
    void computeTimeStatus_dueDateAfterToday_shouldReturnUpcoming() {
        Task task = Task.builder().title("未来任务")
                .dueAt(Instant.parse("2026-04-14T00:00:00Z"))
                .timezone("UTC")
                .build();

        assertThat(timeStatusService.computeTimeStatus(task)).isEqualTo(TimeStatus.UPCOMING);
    }
}
