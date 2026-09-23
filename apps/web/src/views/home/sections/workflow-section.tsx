import { SectionHeading } from "@/components/section-heading";
import { workflow } from "@/content/homepage";
import { Badge } from "@packages/ui/components/badge";
import { Card, CardContent } from "@packages/ui/components/card";

export function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="scroll-mt-8 container py-24"
      aria-labelledby="workflow-title"
    >
      <SectionHeading
        id="workflow-title"
        title="Pick a task. Press start. That's it."
        description="The whole loop fits between two sips of coffee."
      />
      <Card>
        <CardContent className="grid gap-8 py-2 md:grid-cols-3 md:gap-0">
          {workflow.map((step, index) => (
            <div
              key={step.title}
              className="flex gap-4 md:px-5 first:md:pl-0 last:md:pr-0"
            >
              <Badge variant="secondary">{index + 1}</Badge>
              <div className="space-y-2">
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <kbd className="rounded-md border bg-muted px-2 py-1 text-xs text-foreground">
            Tray icon
          </kbd>
          Start, stop, and breaks
        </span>
        <span className="flex items-center gap-2">
          <kbd className="rounded-md border bg-muted px-2 py-1 text-xs text-foreground">
            ⌘/Ctrl K
          </kbd>
          Command palette
        </span>
      </div>
    </section>
  );
}
