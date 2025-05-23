import moment from "moment";
import { get } from "svelte/store";
import { test, expect, describe } from "vitest";

import { EditMode } from "../../src/ui/hooks/use-edit/types";

import {
  baseTask,
  baseTasks,
  dayKey,
  emptyTasks,
  nextDayKey,
  tasksWithUnscheduledTask,
  threeTasksOverTwoDays,
} from "./util/fixtures";
import { setUp } from "./util/setup";

describe("moving tasks between containers", () => {
  test("with no edit operation in progress, nothing happens on mouse move", () => {
    const { moveCursorTo, dayToDisplayedTasks } = setUp({
      tasks: baseTasks,
    });

    const initial = get(dayToDisplayedTasks);

    moveCursorTo(moment("2023-01-01 01:00"));

    expect(get(dayToDisplayedTasks)).toEqual(initial);
  });

  test("scheduling works between days", () => {
    const { handlers, moveCursorTo, dayToDisplayedTasks } = setUp({
      tasks: tasksWithUnscheduledTask,
    });

    handlers.handleGripMouseDown(baseTask, EditMode.DRAG);
    moveCursorTo(moment("2023-01-02 01:00"));

    expect(get(dayToDisplayedTasks)).toMatchObject({
      [nextDayKey]: {
        withTime: [{ startTime: moment("2023-01-02 01:00") }],
      },
    });
  });

  test("drag works between days", () => {
    const { handlers, moveCursorTo, dayToDisplayedTasks } = setUp({
      tasks: [
        baseTask,
        { ...baseTask, id: "2", startTime: moment("2023-01-01 01:00") },
        { ...baseTask, id: "3", startTime: moment("2023-01-02 01:00") },
      ],
    });

    handlers.handleGripMouseDown(baseTask, EditMode.DRAG);
    moveCursorTo(moment("2023-01-02 01:00"));

    expect(get(dayToDisplayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [{ id: "2", startTime: moment("2023-01-01 01:00") }],
      },
      [nextDayKey]: {
        withTime: [
          { startTime: moment("2023-01-02 01:00") },
          { id: "3", startTime: moment("2023-01-02 01:00") },
        ],
      },
    });
  });

  test("drag many works between days", () => {
    const { handlers, moveCursorTo, dayToDisplayedTasks } = setUp({
      tasks: threeTasksOverTwoDays,
    });

    handlers.handleGripMouseDown(baseTask, EditMode.DRAG_AND_SHIFT_OTHERS);
    moveCursorTo(moment("2023-01-02 02:00"));

    expect(get(dayToDisplayedTasks)).toMatchObject({
      [nextDayKey]: {
        withTime: [
          { startTime: moment("2023-01-02 02:00") },
          { id: "2", startTime: moment("2023-01-02 03:00") },
          { id: "3", startTime: moment("2023-01-02 04:00") },
        ],
      },
    });
  });

  test("drag many does not mess with other days", () => {
    const { handlers, moveCursorTo, dayToDisplayedTasks } = setUp({
      tasks: threeTasksOverTwoDays,
    });

    handlers.handleGripMouseDown(baseTask, EditMode.DRAG_AND_SHIFT_OTHERS);
    moveCursorTo(moment("2023-01-01 05:00"));

    expect(get(dayToDisplayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [
          { startTime: moment("2023-01-01 05:00") },
          { startTime: moment("2023-01-01 06:00") },
        ],
      },
      [nextDayKey]: {
        withTime: [{ id: "3", startTime: moment("2023-01-02 02:00") }],
      },
    });
  });

  test.skip("create works between days", () => {
    const { handlers, moveCursorTo, dayToDisplayedTasks } = setUp({
      tasks: emptyTasks,
    });

    moveCursorTo(moment("2023-01-01 01:00"));
    handlers.handleContainerMouseDown();
    moveCursorTo(moment("2023-01-02 02:00"));

    expect(get(dayToDisplayedTasks)).toMatchObject({
      [nextDayKey]: {
        withTime: [
          { startTime: moment("2023-01-02 01:00"), durationMinutes: 60 },
        ],
      },
    });
  });

  // todo: fix
  test("resize doesn't works between days", () => {
    const { handlers, dayToDisplayedTasks } = setUp();

    handlers.handleResizerMouseDown(baseTask, EditMode.RESIZE);

    expect(get(dayToDisplayedTasks)).toMatchObject({
      [dayKey]: {
        withTime: [{ id: "id", startTime: moment("2023-01-01 00:00") }],
      },
    });
  });
});
