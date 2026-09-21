"use client";

import * as React from "react";
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
import { useIsMobile } from "../hooks/use-mobile";

type ResponsiveSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
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
  side = "right",
  footer,
  children,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && (
              <DrawerDescription>{description}</DrawerDescription>
            )}
          </DrawerHeader>
          <div className="grid gap-3 px-4">{children}</div>
          {footer && <DrawerFooter>{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="grid gap-3 px-4">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
