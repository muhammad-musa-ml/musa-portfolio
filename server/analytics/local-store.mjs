import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { LIMITS } from "./schema.mjs";

/** Explicit local-test persistence only. Production APIs never import this adapter. */
export async function createLocalStore(file) {
  let records = [];
  try {
    const content = await readFile(file, "utf8");
    if (Buffer.byteLength(content) > 32 * 1024 * 1024)
      throw new Error("Local analytics file exceeds 32 MB");
    records = content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  let pending = Promise.resolve();
  return {
    kind: "local-test-file",
    append(next, now = new Date()) {
      const work = pending.then(async () => {
        const oldest = now.getTime() - LIMITS.retentionDays * 86_400_000;
        records = records.filter((event) => Date.parse(event.at) > oldest);
        const day = now.toISOString().slice(0, 10);
        if (
          records.filter((event) => event.at.startsWith(day)).length +
            next.length >
          LIMITS.dailyEvents
        )
          return { status: "capacity", accepted: 0 };
        const seen = new Set(
          records.map((event) => `${event.sid}:${event.seq}`),
        );
        const fresh = next.filter((event) => {
          const key = `${event.sid}:${event.seq}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const updated = [...records, ...fresh].slice(-20_000);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(
          `${file}.tmp`,
          updated.map((event) => JSON.stringify(event)).join("\n") + "\n",
        );
        await rename(`${file}.tmp`, file);
        records = updated;
        return { status: "ok", accepted: fresh.length };
      });
      pending = work.catch(() => {});
      return work;
    },
    async read({ from, to }) {
      await pending;
      return {
        records: records.filter(
          (event) =>
            event.at.slice(0, 10) >= from && event.at.slice(0, 10) <= to,
        ),
        cursor: null,
      };
    },
  };
}
