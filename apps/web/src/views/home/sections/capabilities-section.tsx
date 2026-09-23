import {
  Coffee,
  FolderKanban,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { SectionHeading } from "@/components/section-heading";
import { capabilities } from "@/content/homepage";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";

const capabilityIcons = {
  timer: Timer,
  folder: FolderKanban,
  coffee: Coffee,
  shield: ShieldCheck,
} as const;

export function CapabilitiesSection() {
  return (
    <section aria-labelledby="capabilities-title" className="container py-24">
      <SectionHeading
        id="capabilities-title"
        title="Built for focused work"
        description="Tymar tracks work and break sessions from the system tray, organizes them under projects and tasks, and keeps a history you can trust."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {capabilities.map((capability) => {
          const Icon = capabilityIcons[capability.icon];

          return (
            <Card key={capability.title} className="h-full">
              <CardHeader>
                <Icon
                  className="mb-2 size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <CardTitle>{capability.title}</CardTitle>
                <CardDescription className="leading-6">
                  {capability.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
