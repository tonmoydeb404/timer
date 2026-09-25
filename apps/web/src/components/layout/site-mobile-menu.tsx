"use client";

import { APP_NAME } from "@/content/homepage";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { appPaths, sitePaths } from "@/config/paths-config";
import { Button } from "@packages/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@packages/ui/components/drawer";
import { navItems } from "./config";

export function SiteMobileMenu() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerTrigger render={<Button variant="outline" size="icon" />}>
          <Menu aria-hidden="true" />
          <span className="sr-only">Open navigation</span>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{APP_NAME}</DrawerTitle>
            <DrawerDescription>
              Effortless time tracking for focused work.
            </DrawerDescription>
          </DrawerHeader>
          <nav className="flex flex-col px-4" aria-label="Mobile navigation">
            {navItems.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="border-b py-4 text-base font-medium last:border-b-0"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="border-b py-4 text-base font-medium last:border-b-0"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <DrawerFooter>
            <Button
              nativeButton={false}
              render={<Link href={sitePaths.download}>Download</Link>}
              variant={"secondary"}
            />
            <Button
              nativeButton={false}
              render={<Link href={appPaths.login}>Login</Link>}
            />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
