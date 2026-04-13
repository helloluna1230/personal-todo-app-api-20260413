package com.todo.application.service;

import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class TimeStatusService {

    public TimeStatus computeTimeStatus(Task task) {
        if (task.getStatus() == TaskStatus.DONE) {
            return TimeStatus.DONE;
        }
        if (task.getDueAt() == null) {
            return TimeStatus.NO_DUE_DATE;
        }
        ZoneId zoneId = task.getTimezone() != null ? ZoneId.of(task.getTimezone()) : ZoneId.systemDefault();
        LocalDate today = LocalDate.now(zoneId);
        LocalDate dueDay = task.getDueAt().atZone(zoneId).toLocalDate();
        if (dueDay.isBefore(today)) {
            return TimeStatus.OVERDUE;
        } else if (dueDay.isEqual(today)) {
            return TimeStatus.TODAY;
        } else {
            return TimeStatus.UPCOMING;
        }
    }
}
