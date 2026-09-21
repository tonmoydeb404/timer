import { DowngradeNoticeDialog } from "@/components/downgrade-notice-dialog";
import { UpdateNoticeDialog } from "@/components/update-notice-dialog";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { useApp } from "@/context/app-context";
import { brand } from "@/lib/brand";
import { useCallback, useEffect, useRef, useState } from "react";
import { coerce, compare } from "semver";

type StartupModalKind = "welcome" | "updated" | "downgraded" | null;

const VERSION_KEY = "last_opened_version";

export function StartupModals() {
  const { loading, settings, updateSetting } = useApp();
  const [kind, setKind] = useState<StartupModalKind>(null);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const decided = useRef(false);

  useEffect(() => {
    if (loading || decided.current) return;
    decided.current = true;

    const stored = settings[VERSION_KEY];
    if (!stored) {
      setKind("welcome");
      return;
    }

    const storedVer = coerce(stored);
    const currentVer = coerce(brand.version);
    if (!storedVer || !currentVer) return;

    const cmp = compare(storedVer, currentVer);
    if (cmp < 0) {
      setKind("updated");
      setPreviousVersion(stored);
    } else if (cmp > 0) {
      setKind("downgraded");
      setPreviousVersion(stored);
    }
  }, [loading, settings]);

  const handleWelcomeDone = useCallback(async () => {
    await updateSetting(VERSION_KEY, brand.version);
    setKind(null);
  }, [updateSetting]);

  const handleNoticeDismiss = useCallback(() => {
    updateSetting(VERSION_KEY, brand.version);
    setKind(null);
  }, [updateSetting]);

  return (
    <>
      <WelcomeDialog open={kind === "welcome"} onGetStarted={handleWelcomeDone} />
      <UpdateNoticeDialog
        open={kind === "updated"}
        previousVersion={previousVersion}
        onDismiss={handleNoticeDismiss}
      />
      <DowngradeNoticeDialog
        open={kind === "downgraded"}
        previousVersion={previousVersion ?? ""}
        onDismiss={handleNoticeDismiss}
      />
    </>
  );
}
