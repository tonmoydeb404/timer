"use client";

import { useRef } from "react";
import {
  ProjectListSection,
  type ProjectListSectionHandle,
} from "./sections/project-list-section";
import { ProjectsHeaderSection } from "./sections/projects-header-section";

export function ProjectsView() {
  const listRef = useRef<ProjectListSectionHandle>(null);

  return (
    <div className="grid gap-6">
      <ProjectsHeaderSection onNew={() => listRef.current?.openCreate()} />
      <ProjectListSection ref={listRef} />
    </div>
  );
}
