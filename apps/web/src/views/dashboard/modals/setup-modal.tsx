"use client";

import { useProjects } from "@/contexts/app/app-context";
import { useAuth } from "@/lib/auth-context";
import { ensureUserSetup, getProfile, listProjects } from "@/lib/db";
import { Button } from "@packages/ui/components/button";
import { ResponsiveSheet } from "@packages/ui/components/responsive-sheet";
import { useCallback, useEffect, useState } from "react";

export function SetupModal() {
  const { user } = useAuth();
  const { reload: reloadProjects } = useProjects();
  const [open, setOpen] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profile, projects] = await Promise.all([
        getProfile(user.$id),
        listProjects(user.$id, true, true),
      ]);
      if (!cancelled) setOpen(!profile || projects.length === 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleConfirm = useCallback(async () => {
    if (!user) return;
    setSettingUp(true);
    setError(null);
    try {
      await ensureUserSetup({
        userId: user.$id,
        name: user.name,
        email: user.email,
      });
      setOpen(false);
      void reloadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSettingUp(false);
    }
  }, [user, reloadProjects]);

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={() => {}}
      title="Set up your workspace"
      description="We'll create your profile and a starter “Personal” project to track time against."
      footer={
        <Button className="w-full" disabled={settingUp} onClick={handleConfirm}>
          {settingUp ? "Setting up…" : "Get started"}
        </Button>
      }
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ResponsiveSheet>
  );
}
