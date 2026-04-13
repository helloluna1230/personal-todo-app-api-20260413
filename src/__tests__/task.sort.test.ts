import { Task, TaskPriority, TaskStatus } from '../task.model';
import { sortTasks, sortTasksForToday } from '../task.sort';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

function makeTask(overrides: Partial<Task> & { createdAt?: Date }): Task {
  return {
    id: String(++idCounter),
    title: `Task ${idCounter}`,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueAt: null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  idCounter = 0;
});

// ---------------------------------------------------------------------------
// Default view sort
// ---------------------------------------------------------------------------

describe('sortTasks – default view', () => {
  describe('status ordering', () => {
    it('places TODO tasks before DONE tasks regardless of priority', () => {
      const done = makeTask({ status: TaskStatus.DONE, priority: TaskPriority.HIGH });
      const todo = makeTask({ status: TaskStatus.TODO, priority: TaskPriority.LOW });

      const result = sortTasks([done, todo]);

      expect(result[0].status).toBe(TaskStatus.TODO);
      expect(result[1].status).toBe(TaskStatus.DONE);
    });
  });

  describe('priority ordering', () => {
    it('places HIGH priority tasks before MEDIUM priority tasks', () => {
      const medium = makeTask({ priority: TaskPriority.MEDIUM });
      const high = makeTask({ priority: TaskPriority.HIGH });

      const result = sortTasks([medium, high]);

      expect(result[0].priority).toBe(TaskPriority.HIGH);
      expect(result[1].priority).toBe(TaskPriority.MEDIUM);
    });

    it('places HIGH priority tasks before LOW priority tasks', () => {
      const low = makeTask({ priority: TaskPriority.LOW });
      const high = makeTask({ priority: TaskPriority.HIGH });

      const result = sortTasks([low, high]);

      expect(result[0].priority).toBe(TaskPriority.HIGH);
      expect(result[1].priority).toBe(TaskPriority.LOW);
    });

    it('places MEDIUM priority tasks before LOW priority tasks', () => {
      const low = makeTask({ priority: TaskPriority.LOW });
      const medium = makeTask({ priority: TaskPriority.MEDIUM });

      const result = sortTasks([low, medium]);

      expect(result[0].priority).toBe(TaskPriority.MEDIUM);
      expect(result[1].priority).toBe(TaskPriority.LOW);
    });

    it('sorts all three priorities correctly: HIGH > MEDIUM > LOW', () => {
      const low = makeTask({ priority: TaskPriority.LOW });
      const high = makeTask({ priority: TaskPriority.HIGH });
      const medium = makeTask({ priority: TaskPriority.MEDIUM });

      const result = sortTasks([low, high, medium]);

      expect(result.map((t) => t.priority)).toEqual([
        TaskPriority.HIGH,
        TaskPriority.MEDIUM,
        TaskPriority.LOW,
      ]);
    });
  });

  describe('secondary sort by dueAt', () => {
    it('within the same priority, sorts tasks with earlier dueAt first', () => {
      const later = makeTask({
        priority: TaskPriority.HIGH,
        dueAt: new Date('2026-02-01T00:00:00Z'),
      });
      const earlier = makeTask({
        priority: TaskPriority.HIGH,
        dueAt: new Date('2026-01-15T00:00:00Z'),
      });

      const result = sortTasks([later, earlier]);

      expect(result[0]).toBe(earlier);
      expect(result[1]).toBe(later);
    });

    it('places tasks with a dueAt before tasks without a dueAt', () => {
      const noDue = makeTask({ priority: TaskPriority.HIGH, dueAt: null });
      const hasDue = makeTask({
        priority: TaskPriority.HIGH,
        dueAt: new Date('2026-12-31T00:00:00Z'),
      });

      const result = sortTasks([noDue, hasDue]);

      expect(result[0]).toBe(hasDue);
      expect(result[1]).toBe(noDue);
    });
  });

  describe('tertiary sort by createdAt', () => {
    it('within the same priority and dueAt, sorts tasks with earlier createdAt first', () => {
      const dueDate = new Date('2026-03-01T00:00:00Z');
      const newerCreated = makeTask({
        priority: TaskPriority.MEDIUM,
        dueAt: dueDate,
        createdAt: new Date('2026-01-10T00:00:00Z'),
      });
      const olderCreated = makeTask({
        priority: TaskPriority.MEDIUM,
        dueAt: dueDate,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      const result = sortTasks([newerCreated, olderCreated]);

      expect(result[0]).toBe(olderCreated);
      expect(result[1]).toBe(newerCreated);
    });
  });

  describe('stable sort – combined rules', () => {
    it('applies all four sort criteria in order', () => {
      const due1 = new Date('2026-04-01T00:00:00Z');
      const due2 = new Date('2026-05-01T00:00:00Z');
      const created1 = new Date('2026-01-01T00:00:00Z');
      const created2 = new Date('2026-01-02T00:00:00Z');

      const tasks: Task[] = [
        makeTask({ status: TaskStatus.DONE, priority: TaskPriority.HIGH, dueAt: due1, createdAt: created1 }),  // [0] done – always last group
        makeTask({ status: TaskStatus.TODO, priority: TaskPriority.LOW, dueAt: due1, createdAt: created1 }),   // [1] todo+low
        makeTask({ status: TaskStatus.TODO, priority: TaskPriority.HIGH, dueAt: due2, createdAt: created1 }),  // [2] todo+high+later due
        makeTask({ status: TaskStatus.TODO, priority: TaskPriority.HIGH, dueAt: due1, createdAt: created2 }), // [3] todo+high+earlier due, newer created
        makeTask({ status: TaskStatus.TODO, priority: TaskPriority.HIGH, dueAt: due1, createdAt: created1 }), // [4] todo+high+earlier due, older created
        makeTask({ status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, dueAt: due1, createdAt: created1 }), // [5] todo+medium
      ];

      const result = sortTasks([...tasks]);

      expect(result[0]).toBe(tasks[4]); // todo, HIGH, due1, created1
      expect(result[1]).toBe(tasks[3]); // todo, HIGH, due1, created2
      expect(result[2]).toBe(tasks[2]); // todo, HIGH, due2
      expect(result[3]).toBe(tasks[5]); // todo, MEDIUM
      expect(result[4]).toBe(tasks[1]); // todo, LOW
      expect(result[5]).toBe(tasks[0]); // done
    });
  });
});

// ---------------------------------------------------------------------------
// Today view sort
// ---------------------------------------------------------------------------

describe('sortTasksForToday – today view', () => {
  const TODAY = new Date('2026-04-13T12:00:00Z');
  const START_OF_TODAY = new Date('2026-04-13T00:00:00.000Z');
  const END_OF_TODAY = new Date('2026-04-13T23:59:59.999Z');

  it('places OVERDUE tasks before TODAY tasks', () => {
    const todayTask = makeTask({ dueAt: new Date('2026-04-13T09:00:00Z') });
    const overdueTask = makeTask({ dueAt: new Date('2026-04-12T23:59:00Z') });

    const result = sortTasksForToday([todayTask, overdueTask], TODAY);

    expect(result[0]).toBe(overdueTask);
    expect(result[1]).toBe(todayTask);
  });

  it('treats tasks due exactly at midnight today as TODAY (not OVERDUE)', () => {
    const atMidnight = makeTask({ dueAt: START_OF_TODAY });

    const result = sortTasksForToday([atMidnight], TODAY);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(atMidnight);
  });

  it('treats tasks due at end of today as TODAY', () => {
    const endOfDay = makeTask({ dueAt: END_OF_TODAY });
    const overdueTask = makeTask({ dueAt: new Date('2026-04-12T00:00:00Z') });

    const result = sortTasksForToday([endOfDay, overdueTask], TODAY);

    expect(result[0]).toBe(overdueTask);
    expect(result[1]).toBe(endOfDay);
  });

  it('within OVERDUE bucket, applies default sort rules (priority then dueAt then createdAt)', () => {
    const overdueLow = makeTask({
      priority: TaskPriority.LOW,
      dueAt: new Date('2026-04-12T10:00:00Z'),
    });
    const overdueHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-12T10:00:00Z'),
    });

    const result = sortTasksForToday([overdueLow, overdueHigh], TODAY);

    expect(result[0]).toBe(overdueHigh);
    expect(result[1]).toBe(overdueLow);
  });

  it('within TODAY bucket, applies default sort rules', () => {
    const todayLow = makeTask({
      priority: TaskPriority.LOW,
      dueAt: new Date('2026-04-13T14:00:00Z'),
    });
    const todayHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-13T14:00:00Z'),
    });

    const result = sortTasksForToday([todayLow, todayHigh], TODAY);

    expect(result[0]).toBe(todayHigh);
    expect(result[1]).toBe(todayLow);
  });

  it('sorts a mixed list: OVERDUE first, then TODAY, each sub-sorted by default rules', () => {
    const todayMedium = makeTask({
      priority: TaskPriority.MEDIUM,
      dueAt: new Date('2026-04-13T10:00:00Z'),
    });
    const overdueHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-11T08:00:00Z'),
    });
    const overdueLow = makeTask({
      priority: TaskPriority.LOW,
      dueAt: new Date('2026-04-12T08:00:00Z'),
    });
    const todayHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-13T08:00:00Z'),
    });

    const result = sortTasksForToday([todayMedium, overdueHigh, overdueLow, todayHigh], TODAY);

    expect(result[0]).toBe(overdueHigh);   // OVERDUE + HIGH
    expect(result[1]).toBe(overdueLow);    // OVERDUE + LOW
    expect(result[2]).toBe(todayHigh);     // TODAY + HIGH
    expect(result[3]).toBe(todayMedium);   // TODAY + MEDIUM
  });
});
