// Provisions the Timer Appwrite backend: database, tables, columns, indexes
// and permissions. Uses the current TablesDB API (`/tablesdb/*`) — not the
// deprecated collections/attributes endpoints.
//
// Env is read from `.env.local` (then `.env`) in the repo root; already
// exported variables take precedence. Run with:
//   pnpm provision:appwrite
//
// Required variables: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
// (a server key with database scopes — provisioning only, never shipped).
//
// The script is idempotent — safe to re-run. It waits for columns to become
// available before creating indexes that reference them.

import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const ENDPOINT = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, "");
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "Missing env: set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY.",
  );
  process.exit(1);
}

const DB_ID = "timer";

const str = (key, size, required = false, def = undefined) => ({
  kind: "string",
  key,
  payload: {
    key,
    size,
    required,
    ...(def !== undefined ? { default: def } : {}),
  },
});

const dt = (key, required = false) => ({
  kind: "datetime",
  key,
  payload: { key, required },
});

const en = (key, elements, def) => ({
  kind: "enum",
  key,
  // NOTE: the TablesDB API rejects defaults on required columns, so enums
  // are optional-with-default; clients always send an explicit value.
  payload: { key, elements, required: false, default: def },
});

const idx = (key, type, columns, orders) => ({
  key,
  payload: {
    key,
    type,
    columns,
    ...(orders ? { orders } : {}),
  },
});

/** Mirrors packages/domain collection shapes. Keep in sync. */
const TABLES = [
  {
    id: "profiles",
    name: "Profiles",
    columns: [
      str("userId", 36, true),
      str("name", 128, true),
      str("email", 255, true),
      str("avatarUrl", 2048),
      str("timezone", 64, false, "UTC"),
    ],
    indexes: [idx("user_unique", "unique", ["userId"])],
  },
  {
    id: "projects",
    name: "Projects",
    columns: [
      str("userId", 36, true),
      str("name", 128, true),
      str("description", 4096),
      en("status", ["ACTIVE", "ARCHIVED"], "ACTIVE"),
      dt("deletedAt"),
    ],
    indexes: [
      idx("by_user", "key", ["userId"]),
      idx("by_user_status", "key", ["userId", "status"]),
      idx("by_name", "fulltext", ["name"]),
    ],
  },
  {
    id: "tasks",
    name: "Tasks",
    columns: [
      str("userId", 36, true),
      str("projectId", 36, true),
      str("title", 256, true),
      str("description", 4096),
      en("status", ["TODO", "IN_PROGRESS", "DONE"], "TODO"),
      en("priority", ["LOW", "MEDIUM", "HIGH"], "MEDIUM"),
      dt("dueDate"),
      dt("completedAt"),
      dt("deletedAt"),
    ],
    indexes: [
      idx("by_user_status", "key", ["userId", "status"]),
      idx("by_project", "key", ["projectId"]),
      idx("by_title", "fulltext", ["title"]),
    ],
  },
  {
    id: "time_entries",
    name: "Time entries",
    columns: [
      str("userId", 36, true),
      // Optional: entries can be tracked without a task (project-only or
      // fully unassigned) — see AGENTS.md desktop timer flow.
      str("taskId", 36, false),
      str("projectId", 36, false),
      en("type", ["WORK", "BREAK"], "WORK"),
      dt("startedAt", true),
      dt("endedAt"),
    ],
    indexes: [
      idx("by_user_started", "key", ["userId", "startedAt"], ["ASC", "ASC"]),
      idx("by_task_started", "key", ["taskId", "startedAt"], ["ASC", "ASC"]),
      idx(
        "by_project_started",
        "key",
        ["projectId", "startedAt"],
        ["ASC", "ASC"],
      ),
    ],
  },
];

async function api(method, path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers: {
      "X-Appwrite-Project": PROJECT_ID,
      "X-Appwrite-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = new Error(
      `${method} ${path} → ${res.status}: ${json?.message ?? text}`,
    );
    err.status = res.status;
    throw err;
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDatabase() {
  try {
    await api("GET", `/tablesdb/${DB_ID}`);
    console.log(`database "${DB_ID}" exists, skipping`);
  } catch (err) {
    if (err.status !== 404) throw err;
    try {
      await api("POST", "/tablesdb", { databaseId: DB_ID, name: "Timer" });
      console.log(`database "${DB_ID}" created`);
    } catch (createErr) {
      // Already exists (e.g. created via the legacy endpoint) — carry on.
      if (createErr.status !== 409) throw createErr;
      console.log(`database "${DB_ID}" exists, skipping`);
    }
  }
}

async function waitFor(getter, label, timeoutMs = 90000) {
  const start = Date.now();
  for (;;) {
    const res = await getter();
    if (res?.status === "available" || res?.enabled === true) return;
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await sleep(1500);
  }
}

async function ensureTable(spec) {
  const base = `/tablesdb/${DB_ID}/tables`;
  try {
    await api("GET", `${base}/${spec.id}`);
    console.log(`table "${spec.id}" exists, skipping`);
  } catch (err) {
    if (err.status !== 404) throw err;
    await api("POST", base, {
      tableId: spec.id,
      name: spec.name,
      // Row-level security: every row carries its owner's permissions;
      // only creation is gated at the table level.
      permissions: ['create("users")'],
      rowSecurity: true,
    });
    console.log(`table "${spec.id}" created`);
  }

  for (const col of spec.columns) {
    const colPath = `${base}/${spec.id}/columns/${col.key}`;
    try {
      const existing = await api("GET", colPath);
      // Existing environments may have been provisioned before a column's
      // `required` flag changed in the spec (e.g. taskId true -> false) —
      // the TablesDB API needs an explicit update call for that, it won't
      // happen just by re-running the create call.
      if (existing.required !== col.payload.required) {
        await api(
          "PATCH",
          `${base}/${spec.id}/columns/${col.kind}/${col.key}`,
          // PATCH requires an explicit `default` even when unchanged.
          { ...col.payload, default: col.payload.default ?? null },
        );
        console.log(
          `  column "${spec.id}.${col.key}" updated (required=${col.payload.required})`,
        );
      }
    } catch (err) {
      if (err.status !== 404) throw err;
      await api("POST", `${base}/${spec.id}/columns/${col.kind}`, col.payload);
      console.log(`  column "${spec.id}.${col.key}" created`);
    }
  }

  // Columns provision asynchronously — indexes need them available.
  for (const col of spec.columns) {
    await waitFor(
      () => api("GET", `${base}/${spec.id}/columns/${col.key}`),
      `column ${spec.id}.${col.key}`,
    );
  }

  for (const index of spec.indexes) {
    try {
      await api("GET", `${base}/${spec.id}/indexes/${index.key}`);
    } catch (err) {
      if (err.status !== 404) throw err;
      await api("POST", `${base}/${spec.id}/indexes`, index.payload);
      console.log(`  index "${spec.id}.${index.key}" created`);
    }
  }
}

await ensureDatabase();
for (const spec of TABLES) {
  await ensureTable(spec);
}
console.log("Appwrite backend provisioned.");
