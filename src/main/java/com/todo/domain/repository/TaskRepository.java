package com.todo.domain.repository;

import com.todo.domain.model.Category;
import com.todo.domain.model.Task;
import com.todo.domain.model.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {

    List<Task> findByCategory(Category category);

    @Query("SELECT t FROM Task t WHERE t.status != :status AND t.dueDate <= :today")
    List<Task> findByStatusNotAndDueDateLessThanEqual(
            @Param("status") TaskStatus status,
            @Param("today") LocalDate today);
}
