package com.todo.application.service;

import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class TimeStatusService {

    private final Clock clock;

    public TimeStatusService() {
        this.clock = Clock.systemUTC();
    }

    public TimeStatusService(Clock clock) {
        this.clock = clock;
    }

    public TimeStatus computeTimeStatus(Task task) {
        if (task.getStatus() == TaskStatus.DONE) {
            return TimeStatus.DONE;
        }
        if (task.getDueAt() == null) {
            return TimeStatus.NO_DUE_DATE;
        }
        Instant now = Instant.now(clock);
        if (task.getDueAt().isBefore(now)) {
            return TimeStatus.OVERDUE;
        }
        ZoneId zoneId = task.getTimezone() != null ? ZoneId.of(task.getTimezone()) : clock.getZone();
        LocalDate today = LocalDate.now(clock.withZone(zoneId));
        LocalDate dueDay = task.getDueAt().atZone(zoneId).toLocalDate();
        if (dueDay.isEqual(today)) {
            return TimeStatus.TODAY;
        }
        return TimeStatus.UPCOMING;
    }
}
