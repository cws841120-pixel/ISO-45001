// 본사 ISO 45001 운영 프로그램 (포스코인터내셔널 안전기획실, 웹 버전)
// 데이터는 이 브라우저의 localStorage에만 저장됩니다. 서버로 전송되지 않습니다.
(function () {
  "use strict";

  const KEY = "p-audit-iso45001-v1";
  const $main = document.getElementById("main");

  // ---------- 날짜 ----------
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  const mmdd = (s) => (s ? s.slice(5).replace("-", "/") : "—");
  const WD = "일월화수목금토";

  // ---------- 저장 ----------
  function fresh() {
    const s = JSON.parse(JSON.stringify(window.SEED));
    s.nc.forEach((r) => { if (r.due === "__TODAY+14__") r.due = addDays(today(), 14); });
    s.savedAt = "";
    return s;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.prep && s.evid && s.qa && s.nc) return s;
      }
    } catch (e) { /* 저장소를 쓸 수 없는 환경 */ }
    return fresh();
  }
  let S = load();
  let storageOk = true;
  function save() {
    S.savedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; }
    catch (e) { storageOk = false; toast("이 브라우저에서는 저장할 수 없습니다. 백업 파일로 내려받아 두세요."); }
  }

  // ---------- 공통 ----------
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PILL = {
    "완료": "green", "보유": "green", "준비완료": "green", "검증완료": "green",
    "진행중": "amber", "보완필요": "amber", "조치중": "amber",
    "미착수": "red", "없음": "red", "미준비": "red",
    "조치완료": "blue", "해당없음": "gray",
  };
  const pill = (s) => `<span class="pill p-${PILL[s] || "gray"}">${esc(s)}</span>`;
  const GRADE = { "중부적합": "red", "경부적합": "orange", "관찰사항": "blue", "개선권고": "violet" };
  const tag = (g) => `<span class="tag t-${GRADE[g] || "blue"}">${esc(g)}</span>`;
  const grpOf = (c) => (c && c !== "-" ? String(c).split(".")[0] : "-");
  const nextId = (arr) => arr.reduce((m, r) => Math.max(m, r.id), 0) + 1;
  let toastT;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200);
  }

  // ---------- 지표 ----------
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function stats() {
    const prepAll = S.prep.filter((r) => r.status !== "해당없음");
    const prepDone = prepAll.filter((r) => r.status === "완료").length;
    const t = today();
    const ncOpen = S.nc.filter((r) => r.status !== "검증완료");
    return {
      prepPct: pct(prepDone, prepAll.length), prepDone, prepTotal: prepAll.length,
      prepFreqLeft: prepAll.filter((r) => r.freq && r.status !== "완료").length,
      evidPct: pct(S.evid.filter((r) => r.status === "보유").length, S.evid.length),
      evidHave: S.evid.filter((r) => r.status === "보유").length,
      evidFix: S.evid.filter((r) => r.status === "보완필요").length,
      evidNone: S.evid.filter((r) => r.status === "없음").length,
      evidOld: S.evid.filter((r) => r.revised && diffDays(r.revised, t) > 365).length,
      qaPct: pct(S.qa.filter((r) => r.status === "준비완료").length, S.qa.length),
      qaDone: S.qa.filter((r) => r.status === "준비완료").length,
      qaNoOwner: S.qa.filter((r) => !r.owner).length,
      ncOpen: ncOpen.length,
      ncLate: ncOpen.filter((r) => r.due && r.due < t).length,
    };
  }
  function ring(p, color) {
    const size = 84, w = 10, r = (size - w) / 2, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" style="flex:none"><circle cx="42" cy="42" r="${r}" fill="none" stroke="#E8ECF3" stroke-width="${w}"/>` +
      `<circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 42 42)"/>` +
      `<text x="50%" y="54%" text-anchor="middle" font-size="17" font-weight="700" fill="#0F1E36">${p}%</text></svg>`;
  }

  // ---------- 화면 정의 ----------
  const NAV = [
    ["home", "▦", "준비 현황"], ["prep", "☑", "조항별 체크리스트"], ["evid", "🗂", "증빙문서 대장"],
    ["qa", "💬", "예상질문"], ["nc", "⚠", "부적합·시정조치"], ["brief", "📋", "심사 당일 요약"],
  ];
  const GROUP_OPTS = () => [["", "전체 조항"]].concat(S.groups.map((g) => [g.code, g.code + ". " + g.name]), [["-", "기타"]]);

  const LISTS = {
    prep: {
      title: "조항별 체크리스트", unit: "건", newLabel: "준비항목",
      sub: () => `준비항목 ${S.prep.length}건 · 완료 ${S.prep.filter((r) => r.status === "완료").length}건 · ★ 표시는 사후심사 빈출 항목`,
      filters: [
        { k: "grp", opts: GROUP_OPTS },
        { k: "status", opts: () => [["", "전체 상태"], "미착수", "진행중", "완료", "해당없음"] },
        { k: "freq", opts: () => [["", "전체 항목"], ["y", "빈출 항목만"]], test: (r, v) => !v || r.freq },
      ],
      search: ["title", "clause", "owner"], searchHint: "항목·조항·담당 검색",
      row: (r) => `<div class="rc">${esc(r.clause)}${r.freq ? "<small>★ 빈출</small>" : ""}</div>` +
        `<div class="rb"><div class="rt">${esc(r.title)}</div><div class="rm ${r.due && r.due < today() && r.status !== "완료" ? "late" : ""}">${esc(r.owner || "담당 미정")} · 마감 ${mmdd(r.due)}</div></div>${pill(r.status)}`,
      head: (r) => `조항 ${esc(r.clause)}${r.freq ? " ★ 사후심사 빈출" : ""}`,
      layout: [
        [{ k: "title", label: "항목명" }],
        [{ k: "clause", label: "조항" }, { k: "status", label: "상태", opts: ["미착수", "진행중", "완료", "해당없음"] }],
        [{ k: "owner", label: "담당" }, { k: "due", label: "마감일", type: "date" }],
        [{ k: "memo", label: "메모", type: "area" }],
        [{ k: "freq", label: "빈출 항목", type: "bool" }],
      ],
      blank: () => ({ clause: "", title: "", freq: false, status: "미착수", owner: S.settings.me || "", due: "", memo: "" }),
    },
    evid: {
      title: "증빙문서 대장", unit: "건", newLabel: "증빙",
      sub: () => { const s = stats(); return `증빙 ${S.evid.length}건 · 보유 ${s.evidHave} · 보완필요 ${s.evidFix} · 없음 ${s.evidNone}`; },
      filters: [
        { k: "grp", opts: GROUP_OPTS },
        { k: "status", opts: () => [["", "전체 상태"], "없음", "보완필요", "보유"] },
      ],
      search: ["doc", "clause", "owner"], searchHint: "문서명·조항·담당 검색",
      row: (r) => { const old = r.revised && diffDays(r.revised, today()) > 365;
        return `<div class="rc">${esc(r.clause)}<small style="color:${r.keep === "유지" ? "var(--blue)" : "var(--violet)"}">${esc(r.keep)}</small></div>` +
          `<div class="rb"><div class="rt">${esc(r.doc)}</div><div class="rm">${esc(r.owner || "담당 미정")} · 개정 ${esc(r.revised || "—")}${old ? ' <span style="color:var(--red)">⚠ 1년 경과</span>' : ""}</div></div>${pill(r.status)}`; },
      head: (r) => `조항 ${esc(r.clause)} · 문서화 정보 ${esc(r.keep)}`,
      layout: [
        [{ k: "doc", label: "문서명" }],
        [{ k: "clause", label: "조항" }, { k: "keep", label: "구분", opts: ["유지", "보유"] }],
        [{ k: "status", label: "확보 상태", opts: ["없음", "보완필요", "보유"] }, { k: "revised", label: "최종 개정", type: "date" }],
        [{ k: "owner", label: "담당" }],
        [{ k: "location", label: "보관 위치", type: "url" }],
        [{ k: "memo", label: "메모", type: "area" }],
      ],
      warn: (r) => (r.revised && diffDays(r.revised, today()) > 365 ? "⚠ 최종 개정 후 1년이 지났습니다. 최신본인지 확인하세요." : ""),
      blank: () => ({ clause: "", doc: "", keep: "보유", status: "없음", location: "", owner: S.settings.me || "", revised: "", memo: "" }),
    },
    qa: {
      title: "예상질문", unit: "문항", newLabel: "질문",
      sub: () => `예상질문 ${S.qa.length}문항 · 답변 준비완료 ${S.qa.filter((r) => r.status === "준비완료").length}문항`,
      filters: [
        { k: "grp", opts: GROUP_OPTS },
        { k: "status", opts: () => [["", "전체 상태"], "미준비", "준비완료"] },
      ],
      search: ["question", "clause", "owner", "answer"], searchHint: "질문·조항 검색",
      row: (r) => `<div class="rc">${esc(r.clause)}</div><div class="rb"><div class="rt">${esc(r.question)}</div><div class="rm">답변자 ${esc(r.owner || "미정")}</div></div>${pill(r.status)}`,
      head: (r) => `조항 ${esc(r.clause)}`,
      layout: [
        [{ k: "question", label: "질문", type: "area" }],
        [{ k: "clause", label: "조항" }, { k: "status", label: "상태", opts: ["미준비", "준비완료"] }],
        [{ k: "owner", label: "답변자" }],
        [{ k: "answer", label: "답변 골자", type: "area", tall: true }],
      ],
      blank: () => ({ clause: "", question: "", answer: "", status: "미준비", owner: "" }),
    },
    nc: {
      title: "부적합·시정조치", unit: "건", newLabel: "지적사항",
      sub: () => `사후심사는 직전 심사 지적사항의 조치 완료 확인부터 시작합니다 · 미종결 ${stats().ncOpen}건`,
      filters: [
        { k: "status", opts: () => [["", "전체 상태"], "조치중", "조치완료", "검증완료"] },
        { k: "source", opts: () => [["", "전체 출처"], "직전 심사", "내부심사", "자체 발견"] },
      ],
      search: ["description", "clause", "owner"], searchHint: "내용·조항·담당 검색",
      row: (r) => { const late = r.status !== "검증완료" && r.due && r.due < today();
        return `<div class="rc">${tag(r.grade)}<small style="color:var(--mute);font-weight:400">조항 ${esc(r.clause)}</small></div>` +
          `<div class="rb"><div class="rt">${esc(r.description)}</div><div class="rm ${late ? "late" : ""}">${esc(r.source)} · ${esc(r.owner || "담당 미정")} · 기한 ${esc(r.due || "—")}${late ? " (초과)" : ""}</div></div>${pill(r.status)}`; },
      head: () => "지적사항 상세",
      layout: [
        [{ k: "source", label: "출처", opts: ["직전 심사", "내부심사", "자체 발견"] }, { k: "grade", label: "등급", opts: ["중부적합", "경부적합", "관찰사항", "개선권고"] }],
        [{ k: "clause", label: "조항" }, { k: "status", label: "상태", opts: ["조치중", "조치완료", "검증완료"] }],
        [{ k: "description", label: "지적 내용", type: "area" }],
        [{ k: "cause", label: "근본 원인", type: "area" }],
        [{ k: "action", label: "시정조치", type: "area" }],
        [{ k: "owner", label: "담당" }, { k: "due", label: "완료 기한", type: "date" }],
      ],
      blank: () => ({ source: "자체 발견", grade: "경부적합", clause: "", status: "조치중", description: "", cause: "", action: "", owner: S.settings.me || "", due: "" }),
    },
  };

  // ---------- 상태 ----------
  const ui = { screen: "home", sel: {}, mode: "", filt: {}, homeMine: false };
  NAV.forEach(([k]) => { ui.filt[k] = {}; });

  function go(screen, opts) {
    ui.screen = screen; ui.mode = "";
    if (opts && opts.sel != null) ui.sel[screen] = opts.sel;
    if (opts && opts.grp != null) ui.filt[screen] = { grp: opts.grp };
    if (location.hash !== "#" + screen) history.replaceState(null, "", "#" + screen);
    render();
    window.scrollTo(0, 0);
  }

  // ---------- 렌더 ----------
  function renderSide() {
    document.getElementById("nav").innerHTML = NAV.map(([k, ic, t]) =>
      `<button class="nav ${ui.screen === k ? "on" : ""}" data-go="${k}"><span class="ic">${ic}</span>${t}</button>`).join("");
    const st = S.settings, d = st.auditDate;
    let dday = "미정", line = "심사일을 설정하세요";
    if (d) {
      const n = diffDays(today(), d);
      dday = n > 0 ? "D-" + n : n === 0 ? "D-DAY" : "D+" + -n;
      line = d + " (" + WD[new Date(d + "T00:00:00").getDay()] + ")" + (st.cb ? " · " + st.cb : "");
    }
    document.getElementById("aud").innerHTML = `<div class="a1">심사 예정일</div><div class="a2">${dday}</div><div class="a3">${esc(line)}</div>`;
  }

  function header(title, sub, right) {
    return `<div class="top"><div><div class="h1">${title}</div><div class="h2">${sub}</div></div><div>${right || ""}</div></div>`;
  }

  function renderHome() {
    const s = stats();
    const savedTxt = S.savedAt ? new Date(S.savedAt).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "아직 저장 안 됨";
    const kpi = (go, p, c, l, sub, badge, ok) =>
      `<div class="card kpi" data-go="${go}">${ring(p, c)}<div><div class="kl">${l}</div><div class="kv">${p}<small>%</small></div><div class="ks">${sub}</div><div class="kb ${ok ? "ok" : ""}">${badge}</div></div></div>`;
    const bars = S.groups.map((g) => {
      const all = S.prep.filter((r) => r.grp === g.code && r.status !== "해당없음");
      const p = pct(all.filter((r) => r.status === "완료").length, all.length);
      return `<div class="br" data-grp="${g.code}"><span class="bc">${g.code}</span><span class="bn">${esc(g.name)}</span><div class="bt"><div class="bf" style="width:${p}%"></div></div><span class="bp">${p}%</span></div>`;
    }).join("");
    const me = S.settings.me;
    let todo = S.prep.filter((r) => r.status !== "완료" && r.status !== "해당없음" && (!ui.homeMine || (me && r.owner === me)));
    todo.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || (b.freq - a.freq));
    todo = todo.slice(0, 6);
    const t = today();
    const todoH = todo.length ? todo.map((r) => {
      const dd = r.due ? diffDays(t, r.due) : null;
      return `<div class="tr" data-open="prep:${r.id}"><span class="chip">${esc(r.clause)}</span><span class="tt">${esc(r.title)}</span>` +
        `<span class="ks">${esc(r.owner || "담당 미정")}</span>${pill(r.status)}<span class="due ${dd != null && dd < 0 ? "late" : ""}">${dd == null ? "—" : dd >= 0 ? "D-" + dd : "D+" + -dd}</span></div>`;
    }).join("") : `<div class="empty">${ui.homeMine && !me ? "심사 당일 요약 화면에서 내 이름을 먼저 설정하세요." : "남은 할 일이 없습니다."}</div>`;

    $main.innerHTML = header("준비 현황", `ISO 45001:2018 사후관리심사 · 마지막 저장 ${esc(savedTxt)}`,
      `<button class="btn" data-act="mine">${ui.homeMine ? "내 할 일" : "전체 담당"} ▾</button> <button class="btn pri" data-go="brief">심사 당일 요약 보기</button>`) +
      `<div class="alert"><b>사후심사 빈출 항목 중 미완료</b> 준비항목 ${s.prepFreqLeft}건 · 증빙 ${S.evid.length - s.evidHave}건이 남았습니다. 시간이 부족하면 여기부터 처리하세요.</div>` +
      `<div class="kpis">` +
      kpi("prep", s.prepPct, "#2563EB", "준비항목 진척률", `완료 ${s.prepDone} / ${s.prepTotal}건`, `빈출 미완료 ${s.prepFreqLeft}`, !s.prepFreqLeft) +
      kpi("evid", s.evidPct, "#0EA5A4", "증빙 확보율", `보유 ${s.evidHave} · 보완 ${s.evidFix} · 없음 ${s.evidNone}`, `1년 경과 ${s.evidOld}`, !s.evidOld) +
      kpi("qa", s.qaPct, "#8B5CF6", "예상질문 준비율", `답변 완료 ${s.qaDone} / ${S.qa.length}문항`, `담당 미정 ${s.qaNoOwner}`, !s.qaNoOwner) +
      `<div class="card kpi" data-go="nc"><div class="ncring">${s.ncOpen}</div><div><div class="kl">미종결 부적합</div><div class="kv" style="color:var(--red)">${s.ncOpen}<small>건</small></div>` +
      `<div class="ks">전체 ${S.nc.length}건 · 검증완료 ${S.nc.length - s.ncOpen}건</div><div class="kb ${s.ncLate ? "" : "ok"}">기한 초과 ${s.ncLate}</div></div></div></div>` +
      `<div class="grid2"><div class="card pane"><div class="pt">조항별 준비 현황<span>준비항목 완료율 · 누르면 해당 조항으로 이동</span></div>${bars}</div>` +
      `<div class="card pane"><div class="pt">${ui.homeMine ? "내 할 일" : "마감 임박 할 일"}<span>마감일 순 · 상위 6건</span></div>${todoH}</div></div>`;
  }

  function filtered(key) {
    const cfg = LISTS[key], f = ui.filt[key];
    const q = (f.q || "").trim().toLowerCase();
    return S[key].filter((r) => cfg.filters.every((fl) => {
      const v = f[fl.k] || "";
      if (fl.test) return fl.test(r, v);
      return !v || r[fl.k] === v;
    }) && (!q || cfg.search.some((k) => String(r[k] || "").toLowerCase().includes(q))));
  }

  function field(fd, r) {
    const v = r[fd.k] == null ? "" : r[fd.k];
    const id = "f_" + fd.k;
    if (fd.opts) return `<select id="${id}">${fd.opts.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
    if (fd.type === "bool") return `<select id="${id}" style="max-width:120px"><option value="1" ${v ? "selected" : ""}>예</option><option value="" ${v ? "" : "selected"}>아니오</option></select>`;
    if (fd.type === "area") return `<textarea id="${id}" ${fd.tall ? 'style="min-height:180px"' : ""}>${esc(v)}</textarea>`;
    if (fd.type === "date") return `<input id="${id}" type="date" value="${esc(v)}">`;
    if (fd.type === "url") return `<input id="${id}" type="url" value="${esc(v)}" placeholder="https://… (SharePoint 링크 등)">` +
      (/^https?:\/\//i.test(v) ? `<a class="btn pri sm" style="display:inline-block;margin-top:8px;text-decoration:none" href="${esc(v)}" target="_blank" rel="noopener noreferrer">링크 열기</a>` : "");
    return `<input id="${id}" value="${esc(v)}">`;
  }

  function renderList(key) {
    const cfg = LISTS[key], f = ui.filt[key];
    const rows = filtered(key);
    const isNew = ui.mode === "new";
    let r = isNew ? cfg.blank() : S[key].find((x) => x.id === ui.sel[key]);
    if (!r && !isNew && rows.length) { r = rows[0]; ui.sel[key] = r.id; }
    const sel = (fl) => `<select data-filt="${fl.k}">${fl.opts().map((o) => {
      const [val, lab] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(val)}" ${(f[fl.k] || "") === val ? "selected" : ""}>${esc(lab)}</option>`;
    }).join("")}</select>`;

    const listH = rows.length ? rows.map((x) => `<div class="row ${!isNew && r && x.id === r.id ? "sel" : ""}" data-sel="${x.id}">${cfg.row(x)}</div>`).join("")
      : `<div class="empty">조건에 맞는 항목이 없습니다.</div>`;

    let detail;
    if (!r) detail = `<div class="empty">왼쪽에서 항목을 고르거나 새로 등록하세요.</div>`;
    else {
      const w = cfg.warn ? cfg.warn(r) : "";
      detail = `<div class="dh">${isNew ? "새 " + cfg.newLabel + " 등록" : cfg.head(r)}</div>` +
        cfg.layout.map((row) => row.length === 2
          ? `<div class="f2"><label for="f_${row[0].k}">${row[0].label}</label>${field(row[0], r)}<label for="f_${row[1].k}" style="padding-left:6px">${row[1].label}</label>${field(row[1], r)}</div>` +
            (w && row.some((x) => x.k === "revised") ? `<div class="warn">${w}</div>` : "")
          : `<div class="f"><label for="f_${row[0].k}">${row[0].label}</label><div>${field(row[0], r)}</div></div>`).join("") +
        `<div class="acts"><button class="btn pri" data-act="save">저장</button><button class="btn" data-act="revert">${isNew ? "취소" : "되돌리기"}</button><span class="sp"></span>` +
        (isNew ? "" : `<button class="btn del" data-act="del">삭제</button>`) + `</div>`;
    }

    $main.innerHTML = header(cfg.title, cfg.sub(), `<button class="btn pri" data-act="new">+ 새로 등록</button>`) +
      `<div class="split"><div><div class="filters">${cfg.filters.map(sel).join("")}<input data-filt="q" placeholder="${cfg.searchHint}" value="${esc(f.q || "")}"></div>` +
      `<div class="card list"><div class="cnt">${rows.length}${cfg.unit}</div>${listH}</div></div>` +
      `<div class="card detail">${detail}</div></div>`;
  }

  function saveDetail(key) {
    const cfg = LISTS[key];
    const data = {};
    cfg.layout.flat().forEach((fd) => {
      const el = document.getElementById("f_" + fd.k);
      if (!el) return;
      data[fd.k] = fd.type === "bool" ? el.value === "1" : el.value.trim();
    });
    const main = { prep: "title", evid: "doc", qa: "question", nc: "description" }[key];
    if (!data[main]) { toast("내용을 입력하세요."); return; }
    if ("clause" in data) data.grp = grpOf(data.clause);
    if (ui.mode === "new") {
      const rec = Object.assign(cfg.blank(), data, { id: nextId(S[key]) });
      if (key !== "nc") rec.grp = grpOf(rec.clause);
      S[key].push(rec);
      ui.sel[key] = rec.id; ui.mode = "";
      toast("등록했습니다.");
    } else {
      const rec = S[key].find((x) => x.id === ui.sel[key]);
      if (!rec) return;
      Object.assign(rec, data);
      toast("저장했습니다.");
    }
    save(); render();
  }

  function renderBrief() {
    const s = stats(), st = S.settings;
    const left = S.prep.filter((r) => r.freq && r.status !== "완료" && r.status !== "해당없음").map((r) => ({ k: "준비항목", key: "prep", r, c: r.clause, t: r.title }))
      .concat(S.evid.filter((r) => r.status !== "보유").map((r) => ({ k: "증빙", key: "evid", r, c: r.clause, t: r.doc })));
    const open = S.nc.filter((r) => r.status !== "검증완료");
    $main.innerHTML = header("심사 당일 요약", "심사 직전 마지막 점검 · 아래 설정은 모든 화면의 D-day와 내 할 일에 쓰입니다") +
      `<div class="split" style="grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)"><div class="card set">` +
      `<div class="pt">심사 정보 설정</div>` +
      `<div class="f"><label>심사일</label><input id="s_auditDate" type="date" value="${esc(st.auditDate)}"></div>` +
      `<div class="f"><label>인증기관</label><input id="s_cb" value="${esc(st.cb)}" placeholder="예: KSA"></div>` +
      `<div class="f"><label>내 이름</label><input id="s_me" value="${esc(st.me)}" placeholder="담당 칸에 쓰는 이름"></div>` +
      `<div class="f"><label>적용범위</label><textarea id="s_scope">${esc(st.scope)}</textarea></div>` +
      `<div class="f"><span></span><div><button class="btn pri" data-act="settings">설정 저장</button></div></div>` +
      `<div class="pt" style="margin-top:18px">준비 상태 한눈에</div><div class="mini">준비항목 ${s.prepPct}%<br>증빙 확보 ${s.evidPct}%<br>예상질문 ${s.qaPct}%<br>미종결 부적합 ${s.ncOpen}건</div>` +
      `<div class="pt" style="margin-top:18px">데이터 백업</div>` +
      `<div class="toolbar"><button class="btn sm" data-act="export">백업 파일 내려받기</button><button class="btn sm" data-act="import">백업 파일 불러오기</button><button class="btn sm del" data-act="reset">처음 상태로 초기화</button></div>` +
      `<input type="file" id="importFile" accept="application/json,.json" hidden>` +
      `<div class="note">※ 입력한 내용은 지금 쓰는 브라우저에만 저장되며 서버로 보내지 않습니다. 다른 PC나 다른 사람과 이어서 쓰려면 백업 파일을 내려받아 전달하고 불러오세요.${storageOk ? "" : " <b style='color:var(--red)'>현재 이 브라우저는 저장이 막혀 있습니다.</b>"}</div>` +
      `</div><div style="display:grid;gap:16px">` +
      `<div class="card pane"><div class="pt">아직 남은 빈출 항목<span>${left.length}건 · 준비항목과 증빙</span></div><div class="blist">` +
      (left.length ? left.map((x) => `<div class="brow" data-open="${x.key}:${x.r.id}"><span class="k">${x.k}</span><span class="c">${esc(x.c)}</span><span class="t">${esc(x.t)}</span>${pill(x.r.status)}</div>`).join("") : `<div class="empty">남은 항목이 없습니다.</div>`) +
      `</div></div><div class="card pane"><div class="pt">미종결 부적합<span>${open.length}건</span></div><div class="blist">` +
      (open.length ? open.map((r) => `<div class="brow" data-open="nc:${r.id}"><span class="k">${tag(r.grade)}</span><span class="c">${esc(r.clause)}</span><span class="t">${esc(r.description)}</span>${pill(r.status)}</div>`).join("") : `<div class="empty">미종결 부적합이 없습니다.</div>`) +
      `</div></div></div></div>`;
  }

  function render() {
    renderSide();
    if (ui.screen === "home") renderHome();
    else if (ui.screen === "brief") renderBrief();
    else renderList(ui.screen);
  }

  // ---------- 백업 ----------
  function exportJSON() {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ISO45001_백업_" + today() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importJSON(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const s = JSON.parse(fr.result);
        if (!s.prep || !s.evid || !s.qa || !s.nc) throw new Error("bad");
        if (!confirm("지금 화면의 데이터를 백업 파일 내용으로 바꿉니다. 계속할까요?")) return;
        S = Object.assign(fresh(), s); save(); toast("불러왔습니다."); render();
      } catch (e) { toast("이 프로그램의 백업 파일이 아닙니다."); }
    };
    fr.readAsText(file, "utf-8");
  }

  // ---------- 이벤트 ----------
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go],[data-sel],[data-act],[data-open],[data-grp]");
    if (!t) return;
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.grp) return go("prep", { grp: t.dataset.grp });
    if (t.dataset.open) { const [k, id] = t.dataset.open.split(":"); ui.filt[k] = {}; return go(k, { sel: +id }); }
    if (t.dataset.sel) { ui.sel[ui.screen] = +t.dataset.sel; ui.mode = ""; render(); return; }
    const a = t.dataset.act, key = ui.screen;
    if (a === "mine") { ui.homeMine = !ui.homeMine; render(); }
    else if (a === "new") { ui.mode = "new"; render(); const first = document.querySelector(".detail input,.detail textarea"); if (first) first.focus(); }
    else if (a === "save") saveDetail(key);
    else if (a === "revert") { ui.mode = ""; render(); }
    else if (a === "del") {
      const rec = S[key].find((x) => x.id === ui.sel[key]);
      if (rec && confirm("이 항목을 삭제할까요?")) { S[key] = S[key].filter((x) => x !== rec); ui.sel[key] = null; save(); toast("삭제했습니다."); render(); }
    }
    else if (a === "settings") {
      ["auditDate", "cb", "me", "scope"].forEach((k) => { S.settings[k] = document.getElementById("s_" + k).value.trim(); });
      save(); toast("설정을 저장했습니다."); render();
    }
    else if (a === "export") exportJSON();
    else if (a === "import") document.getElementById("importFile").click();
    else if (a === "reset") {
      if (confirm("입력한 내용을 모두 지우고 처음 상태로 돌아갑니다. 먼저 백업 파일을 내려받는 것을 권장합니다. 계속할까요?")) {
        S = fresh(); save(); toast("초기화했습니다."); render();
      }
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "importFile" && e.target.files[0]) return importJSON(e.target.files[0]);
    const k = e.target.dataset.filt;
    if (k && k !== "q") { ui.filt[ui.screen][k] = e.target.value; render(); }
  });
  document.addEventListener("input", (e) => {
    if (e.target.dataset.filt === "q") {
      ui.filt[ui.screen].q = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const el = document.querySelector('[data-filt="q"]');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    }
  });
  window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (NAV.some(([k]) => k === h) && h !== ui.screen) go(h);
  });

  const h0 = location.hash.slice(1);
  if (NAV.some(([k]) => k === h0)) ui.screen = h0;
  render();
})();
