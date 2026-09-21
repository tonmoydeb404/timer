import { cn } from "@/lib/utils";

export type AppScreenshotView = "commands" | "schedules" | "history";

type AppScreenshotProps = {
  view: AppScreenshotView;
  priority?: boolean;
  className?: string;
  hideTitleBar?: boolean;
};

/** A placeholder frame for your app screenshot.
 *
 *  To use a real screenshot: drop PNGs into `public/screenshots/` and swap the
 *  placeholder body for `next/image` (keep the window chrome wrapper below).
 */
export function AppScreenshot({
  className,
  hideTitleBar = false,
}: AppScreenshotProps) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border shadow-xl", className)}
    >
      {!hideTitleBar && (
        <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-1.5">
          <span className="size-2.5 rounded-full bg-red-500/70" />
          <span className="size-2.5 rounded-full bg-yellow-500/70" />
          <span className="size-2.5 rounded-full bg-green-500/70" />
        </div>
      )}
      <div className="flex aspect-[16/10] items-center justify-center bg-muted/40">
        <p className="max-w-xs px-6 text-center text-sm leading-6 text-muted-foreground">
          Replace with a screenshot of your app
          <br />
          <span className="text-xs">
            public/screenshots + components/app-screenshot.tsx
          </span>
        </p>
      </div>
    </div>
  );
}
