import { sitePaths } from "@/config/paths-config";
import { APP_NAME, REPOSITORY_URL } from "@/content/homepage";
import { cn } from "@/lib/utils";
import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

type Props = {
  title?: string;
  description?: string;
  showSourceButton?: boolean;
  className?: string;
};

export const CTACard = (props: Props) => {
  const {
    title = "Get started today",
    description = `Download ${APP_NAME} or inspect the open-source project before installing it.`,
    showSourceButton = true,
    className,
  } = props;
  return (
    <Card className={cn("p-6 md:p-8", className)}>
      <CardHeader className="p-0">
        <CardTitle
          id="closing-title"
          className="text-xl md:text-2xl font-medium"
        >
          {title}
        </CardTitle>
        <CardDescription className="max-w-175 text-base leading-7">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row p-0">
        <Button
          size={"lg"}
          nativeButton={false}
          render={
            <Link href={sitePaths.download} target="_blank" rel="noreferrer">
              Download {APP_NAME}
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          }
        />
        {showSourceButton && (
          <Button
            size={"lg"}
            variant="outline"
            nativeButton={false}
            render={
              <Link href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                View source
              </Link>
            }
          />
        )}
      </CardContent>
    </Card>
  );
};
