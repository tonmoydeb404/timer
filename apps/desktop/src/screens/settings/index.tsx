import { ScreenHeader } from "@/components/screen-header";
import { useApp } from "@/context/app-context";
import { api } from "@/lib/api";
import { brand } from "@/lib/brand";
import { Button } from "@packages/ui/components/button";
import { Switch } from "@packages/ui/components/switch";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, LogIn, LogOut, Moon, Rocket } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="px-1 font-mono text-[10px] font-semibold tracking-wider text-faint uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  icon,
  title,
  description,
  control,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-control text-muted-foreground">
            {icon}
          </span>
        )}
        <span className="grid min-w-0 gap-0.5">
          <strong className="truncate text-xs font-semibold text-ink">
            {title}
          </strong>
          {description && (
            <small className="truncate text-[11px] text-muted-foreground">
              {description}
            </small>
          )}
        </span>
      </div>
      {control}
    </div>
  );
}

// Settings tab: appearance, system, account, about. Mirrors the desktop
// settings dialog content inline for the popup layout.
export function SettingsScreen() {
  const { auth, signIn, signOut, signingIn } = useApp();
  const { theme, setTheme } = useTheme();
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    api
      .isAutostartEnabled()
      .then(setAutostart)
      .catch(() => {});
  }, []);

  async function handleAutostartToggle(checked: boolean) {
    setAutostart(checked);
    try {
      if (checked) {
        await api.enableAutostart();
        toast.success(`${brand.appName} will launch on system boot.`);
      } else {
        await api.disableAutostart();
        toast.success("Autostart disabled.");
      }
    } catch {
      toast.error("Failed to change autostart setting.");
      setAutostart(!checked);
    }
  }

  return (
    <section className="mx-auto grid h-full w-full max-w-[420px] content-start gap-4 overflow-y-auto scrollbar-thin px-3.5 pt-4 pb-4">
      <ScreenHeader title="Settings" />

      <Section title="Appearance">
        <Row
          icon={<Moon size={15} />}
          title="Dark theme"
          description="Toggle between dark and light."
          control={
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(c) => setTheme(c ? "dark" : "light")}
              aria-label="Dark theme"
            />
          }
        />
      </Section>

      <Section title="System">
        <Row
          icon={<Rocket size={15} />}
          title="Start at login"
          description="Launch automatically on boot."
          control={
            <Switch
              checked={autostart}
              onCheckedChange={handleAutostartToggle}
              aria-label="Start at login"
            />
          }
        />
      </Section>

      <Section title="Account">
        <div className="grid gap-2 rounded-xl border border-border bg-card p-3">
          {auth?.status === "active" && auth.user ? (
            <>
              <span className="truncate text-xs font-semibold text-ink">
                {auth.user.name || auth.user.email}
              </span>
              {auth.user.name && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {auth.user.email}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
                className="mt-1 w-fit text-muted-foreground"
              >
                <LogOut size={14} />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-muted-foreground">
                {auth?.status === "unknown"
                  ? "Couldn't reach Appwrite."
                  : "You're signed out."}
              </span>
              <Button
                size="sm"
                onClick={() =>
                  void signIn().then((r) => {
                    if (!r.ok && r.message) toast.error(r.message);
                  })
                }
                disabled={signingIn}
                className="mt-1 w-fit"
              >
                <LogIn size={14} />
                {signingIn ? "Waiting for Google…" : "Sign in with Google"}
              </Button>
            </>
          )}
        </div>
      </Section>

      <Section title="About">
        <div className="grid gap-1 rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
          <span className="text-xs font-semibold text-ink">
            {brand.appName} <span className="text-faint">v{brand.version}</span>
          </span>
          <span>{brand.description.short}</span>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-auto w-fit p-0 text-[11px] text-primary underline-offset-2 hover:underline"
            onClick={() => openUrl(brand.repository).catch(() => {})}
          >
            <ExternalLink size={12} />
            View source on GitHub
          </Button>
        </div>
      </Section>
    </section>
  );
}
