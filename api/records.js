// Supabase 저장소 API (Vercel 서버 함수)
// 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_ACCESS_CODE(선택: 접속 코드)
// 키는 서버에서만 쓰이고 브라우저로 전달되지 않습니다.

const TABLE = "iso_records";
const KINDS = new Set(["prep", "evid", "qa", "nc", "settings"]);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function sb(path, init) {
  const url = process.env.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + path;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(url, Object.assign({}, init, {
    // 새 형식 secret 키(sb_secret_…)는 apikey 헤더만, 예전 service_role 키(JWT)는 Authorization도 함께 보냅니다.
    headers: Object.assign({ apikey: key, "Content-Type": "application/json" }, key.startsWith("eyJ") ? { Authorization: "Bearer " + key } : {}, (init && init.headers) || {}),
  }));
  const text = await r.text();
  if (!r.ok) throw new Error("Supabase " + r.status + ": " + text.slice(0, 300));
  return text ? JSON.parse(text) : null;
}

function validRows(rows) {
  if (!Array.isArray(rows) || rows.length > 2000) return null;
  const out = [];
  for (const r of rows) {
    if (!r || !KINDS.has(r.kind) || !Number.isSafeInteger(r.id) || typeof r.data !== "object" || r.data === null) return null;
    out.push({ kind: r.kind, id: r.id, data: r.data, updated_at: new Date().toISOString() });
  }
  return out;
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

module.exports = async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return send(res, 503, { error: "not_configured" });
  }
  const code = process.env.APP_ACCESS_CODE;
  if (code && req.headers["x-app-code"] !== code) {
    return send(res, 401, { error: "access_code" });
  }
  try {
    if (req.method === "GET") {
      const rows = await sb(TABLE + "?select=kind,id,data,updated_at&order=kind.asc,id.asc&limit=5000");
      return send(res, 200, { rows });
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      const rows = validRows(body.rows);
      if (!rows) return send(res, 400, { error: "bad_rows" });
      // replace=true: 백업 불러오기·초기화 — 기존 데이터를 모두 지우고 새로 넣습니다.
      if (body.replace) await sb(TABLE + "?kind=neq.__none__", { method: "DELETE" });
      if (rows.length) {
        await sb(TABLE + "?on_conflict=kind,id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(rows),
        });
      }
      return send(res, 200, { ok: true, count: rows.length });
    }
    if (req.method === "DELETE") {
      const u = new URL(req.url, "http://x");
      const kind = u.searchParams.get("kind");
      const id = Number(u.searchParams.get("id"));
      if (!KINDS.has(kind) || !Number.isSafeInteger(id)) return send(res, 400, { error: "bad_key" });
      await sb(TABLE + "?kind=eq." + kind + "&id=eq." + id, { method: "DELETE" });
      return send(res, 200, { ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "method" });
  } catch (e) {
    console.error(e);
    return send(res, 502, { error: "supabase", detail: String(e.message || e).slice(0, 300) });
  }
};
