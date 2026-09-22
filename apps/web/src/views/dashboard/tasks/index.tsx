"use client";

import { useRef } from "react";
import {
  TaskListSection,
  type TaskListSectionHandle,
} from "./sections/task-list-section";
import { TasksHeaderSection } from "./sections/tasks-header-section";

export function TasksView() {
  const listRef = useRef<TaskListSectionHandle>(null);

  return (
    <div className="grid gap-6">
      <TasksHeaderSection onNew={() => listRef.current?.openCreate()} />
      <TaskListSection ref={listRef} />
    </div>
  );
}
