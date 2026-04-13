package com.todo.application.service;

import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import com.todo.domain.model.TimeStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class TimeStatusService {

    public TimeStatus computeTimeStatus(Task task) {
        if (task.getStatus() == TaskStatus.DONE) {
            return TimeStatus.DONE;
        }
        if (task.getDueDate() == null) {
            return TimeStatus.NO_DUE_DATE;
        }
        LocalDate today = LocalDate.now();
        LocalDate due = task.getDueDate();
        if (due.isBefore(today)) {
            return TimeStatus.OVERDUE;
        } else if (due.isEqual(today)) {
            return TimeStatus.TODAY;
        } else {
            return TimeStatus.UPCOMING;
        }
    }
}
