import { LIMITS } from "./schema.mjs";

// One atomic bounded append. The hash tag keeps keys together on Redis clusters.
const APPEND = `
local n = tonumber(ARGV[1])
if tonumber(redis.call('GET', KEYS[2]) or '0') + n > tonumber(ARGV[2]) then return {'rate', 0} end
if redis.call('LLEN', KEYS[1]) + n > tonumber(ARGV[3]) then return {'capacity', 0} end
redis.call('INCRBY', KEYS[2], n)
redis.call('EXPIRE', KEYS[2], 120)
if tonumber(redis.call('GET', KEYS[3]) or '0') + n > tonumber(ARGV[4]) then return {'rate', 0} end
if redis.call('SCARD', KEYS[4]) + n > tonumber(ARGV[5]) then return {'session', 0} end
redis.call('INCRBY', KEYS[3], n)
redis.call('EXPIRE', KEYS[3], 120)
local accepted = 0
for i = 1,n do
  local position = 6 + (i - 1) * 2
  if redis.call('SADD', KEYS[4], ARGV[position + 1]) == 1 then
    redis.call('RPUSH', KEYS[1], ARGV[position + 2])
    accepted = accepted + 1
  end
end
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[6]))
redis.call('EXPIRE', KEYS[4], 172800)
return {'ok', accepted}
`;

export function createRedisStore(env, request = fetch) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  )
    throw new Error("Invalid analytics storage configuration");
  const prefix = "{musa-analytics}:v1";
  const command = async (args) => {
    const response = await request(endpoint.href.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Analytics storage unavailable");
    const body = await response.json();
    if (body.error) throw new Error("Analytics storage command failed");
    return body.result;
  };
  return {
    kind: "upstash-redis",
    async append(records, now = new Date()) {
      if (!records.length) return { status: "ok", accepted: 0 };
      const day = now.toISOString().slice(0, 10);
      const minute = Math.floor(now.getTime() / 60_000);
      const sid = records[0].sid;
      const serialized = records.map((record) => JSON.stringify(record));
      if (
        serialized.some(
          (record) => new TextEncoder().encode(record).length > 1024,
        )
      )
        throw new Error("Analytics record too large");
      const result = await command([
        "EVAL",
        APPEND,
        4,
        `${prefix}:events:${day}`,
        `${prefix}:rate:${minute}`,
        `${prefix}:rate:${sid}:${minute}`,
        `${prefix}:seen:${sid}`,
        records.length,
        LIMITS.globalMinute,
        LIMITS.dailyEvents,
        LIMITS.sessionMinute,
        LIMITS.sessionEvents,
        LIMITS.retentionDays * 86400,
        ...records.flatMap((record, index) => [record.seq, serialized[index]]),
      ]);
      return { status: result[0], accepted: result[1] };
    },
    async read({ from, to, cursor, limit = 2000 }) {
      const dates = dateRange(from, to);
      let day = cursor?.day || dates[0];
      let offset = cursor?.offset || 0;
      if (!dates.includes(day)) throw new Error("Invalid export cursor");
      const records = [];
      for (let index = dates.indexOf(day); index < dates.length; index++) {
        day = dates[index];
        const remaining = limit - records.length;
        const rows = await command([
          "LRANGE",
          `${prefix}:events:${day}`,
          offset,
          offset + remaining - 1,
        ]);
        for (const row of rows) records.push(JSON.parse(row));
        if (rows.length >= remaining)
          return { records, cursor: { day, offset: offset + rows.length } };
        offset = 0;
      }
      return { records, cursor: null };
    },
  };
}

export function dateRange(from, to) {
  if (
    ![from, to].every(
      (day) =>
        typeof day === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        Number.isFinite(Date.parse(`${day}T00:00:00Z`)) &&
        new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day,
    )
  )
    throw new Error("Use valid UTC dates: YYYY-MM-DD");
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  const count = (end - start) / 86_400_000 + 1;
  if (count < 1 || count > LIMITS.retentionDays)
    throw new Error(`Choose at most ${LIMITS.retentionDays} days`);
  return Array.from({ length: count }, (_, index) =>
    new Date(start + index * 86_400_000).toISOString().slice(0, 10),
  );
}
