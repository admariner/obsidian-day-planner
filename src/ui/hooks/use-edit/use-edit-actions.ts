import { get, type Readable, type Writable } from "svelte/store";

import type { LocalTask } from "../../../task-types";
import type { OnUpdateFn } from "../../../types";

import type { EditOperation } from "./types";

interface UseEditActionsProps {
  baselineTasks: Writable<LocalTask[]>;
  editOperation: Writable<EditOperation | undefined>;
  tasksWithPendingUpdate: Readable<LocalTask[]>;
  onUpdate: OnUpdateFn;
}

export function useEditActions({
  editOperation,
  baselineTasks,
  tasksWithPendingUpdate,
  onUpdate,
}: UseEditActionsProps) {
  function startEdit(operation: EditOperation) {
    editOperation.set(operation);
  }

  function cancelEdit() {
    editOperation.set(undefined);
  }

  async function confirmEdit() {
    if (get(editOperation) === undefined) {
      return;
    }

    const oldBase = get(baselineTasks);
    const currentTasks = get(tasksWithPendingUpdate);

    baselineTasks.set(currentTasks);
    editOperation.set(undefined);

    await onUpdate(oldBase, currentTasks);
  }

  return {
    startEdit,
    confirmEdit,
    cancelEdit,
  };
}
