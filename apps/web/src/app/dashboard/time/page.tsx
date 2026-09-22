import { TimeView } from "@/views/dashboard/time";
import { Suspense } from "react";

export const metadata = {
  title: "Time",
};

export default function TimePage() {
  return (
    <Suspense>
      <TimeView />
    </Suspense>
  );
}
