import { Task, TaskPriority, TaskStatus, TaskTimeProjection, TimeStatus } from '../task.model';
import { sortTasks, sortTasksForToday } from '../task.sort';
import { computeTimeStatus } from '../time-status.service';

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

function makeProjection(task: Task, timeStatus: TimeStatus): TaskTimeProjection {
  return { task, timeStatus };
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
// TimeStatusService
// ---------------------------------------------------------------------------

describe('computeTimeStatus', () => {
  // Fixed UTC reference: 2026-04-13T12:00:00Z (noon UTC on April 13 2026)
  const TODAY = new Date('2026-04-13T12:00:00.000Z');

  // When task has no timezone, boundaries are UTC midnight (deterministic on any server)
  describe('without explicit timezone (defaults to UTC)', () => {
    it('returns DONE for a completed task regardless of dueAt', () => {
      const task = makeTask({
        status: TaskStatus.DONE,
        dueAt: new Date('2026-04-10T12:00:00.000Z'),
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.DONE);
    });

    it('returns DONE for a completed task with no due date', () => {
      const task = makeTask({ status: TaskStatus.DONE, dueAt: null });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.DONE);
    });

    it('returns NO_DUE_DATE when dueAt is null', () => {
      const task = makeTask({ dueAt: null });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.NO_DUE_DATE);
    });

    it('returns NO_DUE_DATE when dueAt is undefined', () => {
      const task = makeTask({ dueAt: undefined });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.NO_DUE_DATE);
    });

    it('returns OVERDUE when dueAt is just before UTC midnight today', () => {
      const task = makeTask({ dueAt: new Date('2026-04-12T23:59:59.999Z') });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.OVERDUE);
    });

    it('returns TODAY when dueAt is exactly at UTC midnight today', () => {
      const task = makeTask({ dueAt: new Date('2026-04-13T00:00:00.000Z') });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.TODAY);
    });

    it('returns TODAY when dueAt is mid-day UTC today', () => {
      const task = makeTask({ dueAt: new Date('2026-04-13T14:00:00.000Z') });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.TODAY);
    });

    it('returns TODAY when dueAt is exactly at the end of UTC today', () => {
      const task = makeTask({ dueAt: new Date('2026-04-13T23:59:59.999Z') });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.TODAY);
    });

    it('returns UPCOMING when dueAt is tomorrow in UTC', () => {
      const task = makeTask({ dueAt: new Date('2026-04-14T00:00:00.000Z') });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.UPCOMING);
    });

    it('returns UPCOMING when dueAt is far in the future', () => {
      const task = makeTask({ dueAt: new Date('2027-01-01T00:00:00.000Z') });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.UPCOMING);
    });
  });

  // TODAY = 2026-04-13T12:00:00Z
  // America/New_York in April = EDT (UTC-4):  local date is 2026-04-13 08:00
  //   → startOfDay = 2026-04-13T04:00:00Z, endOfDay = 2026-04-14T03:59:59.999Z
  // Asia/Tokyo = JST (UTC+9, no DST):  local date is 2026-04-13 21:00
  //   → startOfDay = 2026-04-12T15:00:00Z, endOfDay = 2026-04-13T14:59:59.999Z
  describe('with explicit timezone', () => {
    it('returns OVERDUE when dueAt is before local midnight (America/New_York)', () => {
      // 2026-04-13T03:59:59.999Z = 2026-04-12T23:59:59.999 EDT → previous day → OVERDUE
      const task = makeTask({
        dueAt: new Date('2026-04-13T03:59:59.999Z'),
        timezone: 'America/New_York',
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.OVERDUE);
    });

    it('returns TODAY when dueAt is exactly at local midnight (America/New_York)', () => {
      // 2026-04-13T04:00:00Z = 2026-04-13T00:00:00 EDT → start of today → TODAY
      const task = makeTask({
        dueAt: new Date('2026-04-13T04:00:00.000Z'),
        timezone: 'America/New_York',
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.TODAY);
    });

    it('returns TODAY when dueAt is end of local day (America/New_York)', () => {
      // 2026-04-14T03:59:59.999Z = 2026-04-13T23:59:59.999 EDT → end of today → TODAY
      const task = makeTask({
        dueAt: new Date('2026-04-14T03:59:59.999Z'),
        timezone: 'America/New_York',
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.TODAY);
    });

    it('returns UPCOMING when dueAt is tomorrow in the task timezone (America/New_York)', () => {
      // 2026-04-14T04:00:00Z = 2026-04-14T00:00:00 EDT → tomorrow → UPCOMING
      const task = makeTask({
        dueAt: new Date('2026-04-14T04:00:00.000Z'),
        timezone: 'America/New_York',
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.UPCOMING);
    });

    it('returns OVERDUE when dueAt is before local midnight (Asia/Tokyo)', () => {
      // 2026-04-12T14:59:59.999Z = 2026-04-12T23:59:59.999 JST → previous day → OVERDUE
      const task = makeTask({
        dueAt: new Date('2026-04-12T14:59:59.999Z'),
        timezone: 'Asia/Tokyo',
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.OVERDUE);
    });

    it('returns TODAY when dueAt is exactly at local midnight (Asia/Tokyo)', () => {
      // 2026-04-12T15:00:00Z = 2026-04-13T00:00:00 JST → start of today → TODAY
      const task = makeTask({
        dueAt: new Date('2026-04-12T15:00:00.000Z'),
        timezone: 'Asia/Tokyo',
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.TODAY);
    });

    it('returns UPCOMING when dueAt is tomorrow in the task timezone (Asia/Tokyo)', () => {
      // 2026-04-13T15:00:00Z = 2026-04-14T00:00:00 JST → tomorrow → UPCOMING
      const task = makeTask({
        dueAt: new Date('2026-04-13T15:00:00.000Z'),
        timezone: 'Asia/Tokyo',
      });
      expect(computeTimeStatus(task, TODAY)).toBe(TimeStatus.UPCOMING);
    });
  });
});

// ---------------------------------------------------------------------------
// Today view sort
// ---------------------------------------------------------------------------

describe('sortTasksForToday – today view', () => {
  it('places OVERDUE projections before TODAY projections', () => {
    const todayTask = makeTask({ dueAt: new Date('2026-04-13T09:00:00.000Z') });
    const overdueTask = makeTask({ dueAt: new Date('2026-04-12T09:00:00.000Z') });

    const projections: TaskTimeProjection[] = [
      makeProjection(todayTask, TimeStatus.TODAY),
      makeProjection(overdueTask, TimeStatus.OVERDUE),
    ];

    const result = sortTasksForToday(projections);

    expect(result[0].task).toBe(overdueTask);
    expect(result[1].task).toBe(todayTask);
  });

  it('within OVERDUE bucket, applies default sort rules (priority then dueAt then createdAt)', () => {
    const overdueLow = makeTask({
      priority: TaskPriority.LOW,
      dueAt: new Date('2026-04-12T10:00:00.000Z'),
    });
    const overdueHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-12T10:00:00.000Z'),
    });

    const result = sortTasksForToday([
      makeProjection(overdueLow, TimeStatus.OVERDUE),
      makeProjection(overdueHigh, TimeStatus.OVERDUE),
    ]);

    expect(result[0].task).toBe(overdueHigh);
    expect(result[1].task).toBe(overdueLow);
  });

  it('within TODAY bucket, applies default sort rules', () => {
    const todayLow = makeTask({
      priority: TaskPriority.LOW,
      dueAt: new Date('2026-04-13T14:00:00.000Z'),
    });
    const todayHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-13T14:00:00.000Z'),
    });

    const result = sortTasksForToday([
      makeProjection(todayLow, TimeStatus.TODAY),
      makeProjection(todayHigh, TimeStatus.TODAY),
    ]);

    expect(result[0].task).toBe(todayHigh);
    expect(result[1].task).toBe(todayLow);
  });

  it('sorts a mixed list: OVERDUE first, then TODAY, each sub-sorted by default rules', () => {
    const todayMedium = makeTask({
      priority: TaskPriority.MEDIUM,
      dueAt: new Date('2026-04-13T10:00:00.000Z'),
    });
    const overdueHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-11T08:00:00.000Z'),
    });
    const overdueLow = makeTask({
      priority: TaskPriority.LOW,
      dueAt: new Date('2026-04-12T08:00:00.000Z'),
    });
    const todayHigh = makeTask({
      priority: TaskPriority.HIGH,
      dueAt: new Date('2026-04-13T08:00:00.000Z'),
    });

    const result = sortTasksForToday([
      makeProjection(todayMedium, TimeStatus.TODAY),
      makeProjection(overdueHigh, TimeStatus.OVERDUE),
      makeProjection(overdueLow, TimeStatus.OVERDUE),
      makeProjection(todayHigh, TimeStatus.TODAY),
    ]);

    expect(result[0].task).toBe(overdueHigh);   // OVERDUE + HIGH
    expect(result[1].task).toBe(overdueLow);    // OVERDUE + LOW
    expect(result[2].task).toBe(todayHigh);     // TODAY + HIGH
    expect(result[3].task).toBe(todayMedium);   // TODAY + MEDIUM
  });

  describe('defensive handling of out-of-scope projections', () => {
    it('sinks UPCOMING tasks below TODAY tasks rather than silently mixing them in', () => {
      const todayTask = makeTask({ dueAt: new Date('2026-04-13T09:00:00.000Z') });
      const upcomingTask = makeTask({ dueAt: new Date('2026-04-20T09:00:00.000Z') });

      const result = sortTasksForToday([
        makeProjection(upcomingTask, TimeStatus.UPCOMING),
        makeProjection(todayTask, TimeStatus.TODAY),
      ]);

      expect(result[0].timeStatus).toBe(TimeStatus.TODAY);
      expect(result[1].timeStatus).toBe(TimeStatus.UPCOMING);
    });

    it('sinks NO_DUE_DATE tasks below TODAY tasks rather than silently mixing them in', () => {
      const todayTask = makeTask({ dueAt: new Date('2026-04-13T09:00:00.000Z') });
      const noDueTask = makeTask({ dueAt: null });

      const result = sortTasksForToday([
        makeProjection(noDueTask, TimeStatus.NO_DUE_DATE),
        makeProjection(todayTask, TimeStatus.TODAY),
      ]);

      expect(result[0].timeStatus).toBe(TimeStatus.TODAY);
      expect(result[1].timeStatus).toBe(TimeStatus.NO_DUE_DATE);
    });

    it('sinks DONE projections below all active buckets', () => {
      const todayTask = makeTask({ dueAt: new Date('2026-04-13T09:00:00.000Z') });
      const doneTask = makeTask({
        status: TaskStatus.DONE,
        dueAt: new Date('2026-04-12T08:00:00.000Z'),
      });

      const result = sortTasksForToday([
        makeProjection(doneTask, TimeStatus.DONE),
        makeProjection(todayTask, TimeStatus.TODAY),
      ]);

      expect(result[0].timeStatus).toBe(TimeStatus.TODAY);
      expect(result[1].timeStatus).toBe(TimeStatus.DONE);
    });

    it('sinks DONE tasks to the back within their time-status bucket', () => {
      const overdueCompleted = makeTask({
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueAt: new Date('2026-04-12T08:00:00.000Z'),
      });
      const overdueTodo = makeTask({
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueAt: new Date('2026-04-12T08:00:00.000Z'),
      });

      const result = sortTasksForToday([
        makeProjection(overdueCompleted, TimeStatus.OVERDUE),
        makeProjection(overdueTodo, TimeStatus.OVERDUE),
      ]);

      // Both are OVERDUE; within bucket, TODO sorts before DONE (default rule 1)
      expect(result[0].task).toBe(overdueTodo);
      expect(result[1].task).toBe(overdueCompleted);
    });
  });
});

