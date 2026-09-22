"use client";

import { useRef } from "react";
import { TimeHeaderSection } from "./sections/time-header-section";
import {
  TimeListSection,
  type TimeListSectionHandle,
} from "./sections/time-list-section";

export function TimeView() {
  const listRef = useRef<TimeListSectionHandle>(null);

  return (
    <div className="grid gap-6">
      <TimeHeaderSection onNew={() => listRef.current?.openCreate()} />
      <TimeListSection ref={listRef} />
    </div>
  );
}
