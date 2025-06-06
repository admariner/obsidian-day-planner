import { flow, groupBy, uniqBy } from "lodash/fp";
import type { Moment } from "moment";
import type { MetadataCache } from "obsidian";
import { derived, type Readable, type Writable } from "svelte/store";

import { addHorizontalPlacing } from "../../overlap/overlap";
import { selectRemoteTasks } from "../../redux/ical/ical-slice";
import type { createUseSelector } from "../../redux/use-selector";
import { DataviewFacade } from "../../service/dataview-facade";
import { WorkspaceFacade } from "../../service/workspace-facade";
import type { DayPlannerSettings } from "../../settings";
import type { LocalTask, Task, WithTime } from "../../task-types";
import type { OnEditAbortedFn, OnUpdateFn, PointerDateTime } from "../../types";
import { hasClockProp } from "../../util/clock";
import * as dv from "../../util/dataview";
import { withClockMoments } from "../../util/dataview";
import * as m from "../../util/moment";
import { getUpdateTrigger } from "../../util/store";
import { getDayKey, getRenderKey } from "../../util/task-utils";

import { useDataviewTasks } from "./use-dataview-tasks";
import { useEditContext } from "./use-edit/use-edit-context";
import { useNewlyStartedTasks } from "./use-newly-started-tasks";
import { useTasksWithActiveClockProps } from "./use-tasks-with-active-clock-props";
import { useVisibleDailyNotes } from "./use-visible-daily-notes";
import { useVisibleDataviewTasks } from "./use-visible-dataview-tasks";

export function useTasks(props: {
  settingsStore: Writable<DayPlannerSettings>;
  debouncedTaskUpdateTrigger: Readable<object>;
  isOnline: Readable<boolean>;
  visibleDays: Readable<Moment[]>;
  layoutReady: Readable<boolean>;
  dataviewFacade: DataviewFacade;
  metadataCache: MetadataCache;
  currentTime: Readable<Moment>;
  workspaceFacade: WorkspaceFacade;
  onUpdate: OnUpdateFn;
  onEditAborted: OnEditAbortedFn;
  pointerDateTime: Readable<PointerDateTime>;
  useSelector: ReturnType<typeof createUseSelector>;
  dataviewChange: Readable<unknown>;
}) {
  const {
    settingsStore,
    visibleDays,
    layoutReady,
    debouncedTaskUpdateTrigger,
    dataviewFacade,
    metadataCache,
    currentTime,
    workspaceFacade,
    pointerDateTime,
    dataviewChange,
    onUpdate,
    onEditAborted,
    useSelector,
  } = props;

  const remoteTasks = useSelector(selectRemoteTasks);

  const visibleDailyNotes = useVisibleDailyNotes(
    layoutReady,
    debouncedTaskUpdateTrigger,
    visibleDays,
  );

  const dataviewTasks = useDataviewTasks({
    dataviewFacade,
    metadataCache,
    settings: settingsStore,
    visibleDailyNotes,
    refreshSignal: debouncedTaskUpdateTrigger,
  });

  const tasksWithActiveClockProps = useTasksWithActiveClockProps({
    dataviewTasks,
  });

  const tasksWithActiveClockPropsAndDurations = derived(
    [tasksWithActiveClockProps, currentTime],
    ([$tasksWithActiveClockProps, $currentTime]) =>
      $tasksWithActiveClockProps.map((task: LocalTask) => ({
        ...task,
        durationMinutes: m.getDiffInMinutes(
          $currentTime,
          task.startTime.clone().startOf("minute"),
        ),
        truncated: ["bottom" as const],
      })),
  );

  const visibleTasksWithClockProps = derived(
    [dataviewTasks, tasksWithActiveClockPropsAndDurations],
    ([$dataviewTasks, $tasksWithActiveClockPropsAndDurations]) => {
      const flatTasksWithClocks = $dataviewTasks
        .filter(hasClockProp)
        .flatMap(withClockMoments)
        .map(dv.toTaskWithClock)
        .concat($tasksWithActiveClockPropsAndDurations);

      return groupBy(
        ({ startTime }) => getDayKey(startTime),
        flatTasksWithClocks,
      );
    },
  );

  function getDisplayedTasksWithClocksForTimeline(day: Moment) {
    return derived(
      visibleTasksWithClockProps,
      ($visibleTasksWithClockProps) => {
        const tasksForDay = $visibleTasksWithClockProps[getDayKey(day)] || [];

        return flow(uniqBy(getRenderKey), addHorizontalPlacing)(tasksForDay);
      },
    );
  }

  const localTasks = useVisibleDataviewTasks(dataviewTasks, visibleDays);

  const tasksWithTimeForToday = derived(
    [localTasks, remoteTasks, currentTime],
    ([$localTasks, $remoteTasks, $currentTime]: [Task[], Task[], Moment]) => {
      return $localTasks
        .concat($remoteTasks)
        .filter(
          (task): task is WithTime<Task> =>
            task.startTime.isSame($currentTime, "day") && !task.isAllDayEvent,
        );
    },
  );

  const abortEditTrigger = derived(
    [localTasks, dataviewChange],
    getUpdateTrigger,
  );

  const editContext = useEditContext({
    workspaceFacade,
    onUpdate,
    onEditAborted,
    settings: settingsStore,
    localTasks,
    remoteTasks,
    pointerDateTime,
    abortEditTrigger,
  });

  const newlyStartedTasks = useNewlyStartedTasks({
    settings: settingsStore,
    tasksWithTimeForToday,
    currentTime,
  });

  return {
    tasksWithActiveClockProps,
    getDisplayedTasksWithClocksForTimeline,
    tasksWithTimeForToday,
    editContext,
    newlyStartedTasks,
  };
}
