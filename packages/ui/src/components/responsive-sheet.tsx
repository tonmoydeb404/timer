"use client";

import { DrawerDescriptionProps } from "@base-ui/react";
import * as React from "react";
import { useIsMobile } from "../hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./sheet";

type ResponsiveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  descriptionProps?: DrawerDescriptionProps;

  /** Sheet side on desktop. Ignored on mobile (bottom drawer). */
  side?: "right" | "left" | "top" | "bottom";
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Form container that renders a side Sheet on desktop and a bottom Drawer
 * on mobile (and other narrow viewports, e.g. a 420px desktop window).
 * Same props, adaptive chrome.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  descriptionProps,
  side = "right",
  footer,
  children,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left mb-5">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription {...descriptionProps}>
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="grid gap-3 px-4">{children}</div>
          {footer && <DrawerFooter className="mt-5">{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription {...descriptionProps}>
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="grid gap-3 px-4">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
