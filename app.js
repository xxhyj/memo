// 메모정리장 메인 코드. 데이터가 바뀔 때마다 저장(자동 저장) 후 화면을 다시 그립니다.

let memos = Store.load("memos");
let todos = Store.load("todos");
let events = Store.load("events");

let currentMemoId = null;   // 편집 중인 메모 (null이면 새 메모)
let todoFilter = "all";     // 할 일 필터: all / today / open / done
let calYear, calMonth;      // 캘린더에 보이는 연/월 (month: 0~11)
let selectedDate = "";      // 캘린더에서 선택한 날짜

const $ = (id) => document.getElementById(id);

// ---------- 도우미 ----------
function pad(n) { return String(n).padStart(2, "0"); }
function toDateStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function today() { return toDateStr(new Date()); }
function nowStr() {
  const d = new Date();
  return toDateStr(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
// "YYYY-MM-DD" 두 날짜 사이의 일수 (b - a)
function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000);
}
// 요소 만들기 (글자는 textContent로 넣어 안전하게 표시)
function el(tag, props, text) {
  const e = document.createElement(tag);
  if (props) Object.assign(e, props);
  if (text !== undefined) e.textContent = text;
  return e;
}
function emptyItem(msg) { return el("li", { className: "empty" }, msg); }
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 1800);
}
function refresh() {
  Store.save("memos", memos);
  Store.save("todos", todos);
  Store.save("events", events);
  renderAll();
}

// ---------- 모바일 하단 메뉴 ----------
document.querySelectorAll(".bottom-nav button").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === btn.dataset.panel));
    document.querySelectorAll(".bottom-nav button").forEach((b) => b.classList.toggle("active", b === btn));
    window.scrollTo(0, 0);
  };
});

// ---------- 할 일 ----------
function ddayLabel(t) {
  const diff = daysBetween(today(), t.dueDate);
  if (t.done) return { text: "마감 " + t.dueDate, cls: "" };
  if (diff < 0) return { text: t.dueDate + " · " + (-diff) + "일 지남", cls: "overdue" };
  if (diff === 0) return { text: t.dueDate + " · 오늘", cls: "dday-today" };
  return { text: t.dueDate + " · D-" + diff, cls: "" };
}
// 할 일 한 줄 (할 일 칸·캘린더 칸 공용)
function todoItem(t) {
  const li = el("li", { className: t.done ? "done" : "" });
  const cb = el("input", { type: "checkbox", checked: t.done });
  cb.onchange = () => { t.done = cb.checked; refresh(); };
  const box = el("div", { className: "grow" });
  const txt = el("span", { className: "txt", title: "눌러서 수정" }, t.text);
  txt.onclick = () => {
    const v = prompt("할 일 수정", t.text);
    if (v && v.trim()) { t.text = v.trim(); refresh(); }
  };
  box.appendChild(txt);
  if (t.dueDate) {
    const d = ddayLabel(t);
    box.appendChild(el("small", { className: d.cls }, d.text));
  }
  li.append(cb, box);
  return li;
}
function addTodo(text, due) {
  todos.unshift({ id: Store.newId("t"), text, dueDate: due || "", done: false, sourceMemoId: "", createdAt: nowStr() });
}
$("todo-form").onsubmit = (e) => {
  e.preventDefault();
  const text = $("todo-text").value.trim();
  if (!text) return;
  addTodo(text, $("todo-due").value);
  $("todo-text").value = ""; $("todo-due").value = "";
  refresh();
};
document.querySelectorAll("#todo-filters .chip").forEach((c) => {
  c.onclick = () => { todoFilter = c.dataset.filter; renderTodos(); };
});
// 마감일 빠른 선택: 오늘(0) / 내일(1) / 없음("")
document.querySelectorAll("[data-quick]").forEach((b) => {
  b.onclick = () => {
    const q = b.dataset.quick;
    $("todo-due").value = q === "" ? "" : toDateStr(new Date(Date.now() + Number(q) * 86400000));
    $("todo-text").focus();
  };
});
function renderTodos() {
  const t0 = today();
  document.querySelectorAll("#todo-filters .chip").forEach((c) => c.classList.toggle("active", c.dataset.filter === todoFilter));
  let shown = todos.filter((t) => {
    if (todoFilter === "open") return !t.done;
    if (todoFilter === "done") return t.done;
    if (todoFilter === "today") return !t.done && t.dueDate && t.dueDate <= t0; // 오늘 마감 + 기한 지남
    return true;
  });
  // 구역별로 묶기: 기한 지남 / 오늘 / 예정 / 마감 없음 / 완료 (구역 안에서는 마감 빠른 순 → 최근 만든 순)
  const byDue = (a, b) => (a.dueDate || "").localeCompare(b.dueDate || "") || b.createdAt.localeCompare(a.createdAt);
  const open = shown.filter((t) => !t.done);
  const groups = [
    ["기한 지남", open.filter((t) => t.dueDate && t.dueDate < t0).sort(byDue)],
    ["오늘", open.filter((t) => t.dueDate === t0).sort(byDue)],
    ["예정", open.filter((t) => t.dueDate && t.dueDate > t0).sort(byDue)],
    ["마감 없음", open.filter((t) => !t.dueDate).sort(byDue)],
    ["완료", shown.filter((t) => t.done).sort((a, b) => b.createdAt.localeCompare(a.createdAt))],
  ];
  const list = $("todo-list");
  list.replaceChildren();
  if (!shown.length) list.appendChild(emptyItem(todos.length ? "해당하는 할 일이 없어요" : "할 일을 추가해 보세요"));
  groups.forEach(([name, items]) => {
    if (!items.length) return;
    list.appendChild(el("li", { className: "group" }, name + " " + items.length));
    items.forEach((t) => {
      const li = todoItem(t);
      const del = el("button", { className: "del", title: "삭제", ariaLabel: "삭제" }, "✕");
      del.onclick = () => {
        if (!confirm("정말 삭제할까요?")) return;
        todos = todos.filter((x) => x.id !== t.id);
        refresh(); toast("삭제했어요");
      };
      li.appendChild(del);
      list.appendChild(li);
    });
  });
}
function renderToday() {
  const t0 = today();
  $("stat-today").textContent = todos.filter((t) => !t.done && t.dueDate === t0).length;
  $("stat-over").textContent = todos.filter((t) => !t.done && t.dueDate && t.dueDate < t0).length;
  $("stat-open").textContent = todos.filter((t) => !t.done).length;
  const ev = $("today-events");
  ev.replaceChildren();
  const list = events.filter((e) => e.date === t0).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  if (!list.length) ev.appendChild(emptyItem("오늘 일정이 없어요"));
  list.forEach((e) => {
    const li = el("li");
    li.append(el("span", { className: "tag" }, e.time || "종일"), el("span", { className: "grow" }, e.title));
    ev.appendChild(li);
  });
}

// ---------- 캘린더 ----------
(function initCalendar() {
  const d = new Date();
  calYear = d.getFullYear(); calMonth = d.getMonth(); selectedDate = today();
})();
$("cal-prev").onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); };
$("cal-next").onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); };
$("cal-today").onclick = () => {
  const d = new Date();
  calYear = d.getFullYear(); calMonth = d.getMonth(); selectedDate = today();
  renderCalendar();
};
$("event-form").onsubmit = (e) => {
  e.preventDefault();
  const title = $("event-title").value.trim();
  if (!title) return;
  events.push({ id: Store.newId("e"), title, date: selectedDate, time: $("event-time").value });
  $("event-title").value = ""; $("event-time").value = "";
  refresh(); toast("일정을 추가했어요");
};
$("event-as-todo").onclick = () => {
  const title = $("event-title").value.trim();
  if (!title) { $("event-title").focus(); return; }
  addTodo(title, selectedDate);
  $("event-title").value = ""; $("event-time").value = "";
  refresh(); toast("할 일로 추가했어요 (마감 " + selectedDate + ")");
};
function hasItems(ds) {
  return events.some((e) => e.date === ds) || todos.some((t) => t.dueDate === ds);
}
function renderCalendar() {
  $("cal-title").textContent = calYear + "년 " + (calMonth + 1) + "월";
  const grid = $("cal-grid");
  grid.replaceChildren();
  ["일", "월", "화", "수", "목", "금", "토"].forEach((n) => grid.appendChild(el("div", { className: "dow" }, n)));
  const first = new Date(calYear, calMonth, 1).getDay();
  const last = new Date(calYear, calMonth + 1, 0).getDate();
  for (let i = 0; i < first; i++) grid.appendChild(el("div"));
  for (let day = 1; day <= last; day++) {
    const ds = calYear + "-" + pad(calMonth + 1) + "-" + pad(day);
    let cls = "day";
    if ((first + day - 1) % 7 === 0) cls += " sun";
    if (ds === today()) cls += " today";
    if (ds === selectedDate) cls += " sel";
    const b = el("button", { className: cls }, String(day));
    if (hasItems(ds)) b.appendChild(el("span", { className: "dot" }));
    b.onclick = () => { selectedDate = ds; renderCalendar(); };
    grid.appendChild(b);
  }
  // 선택한 날짜의 일정·할 일 (라벨로 구분)
  const sd = new Date(selectedDate + "T00:00:00");
  $("cal-selected").textContent = (sd.getMonth() + 1) + "월 " + sd.getDate() + "일 (" + "일월화수목금토"[sd.getDay()] + ") 일정·할 일";
  $("event-form").querySelector(".primary").textContent = "일정 추가";
  const items = $("cal-items");
  items.replaceChildren();
  const dayEvents = events.filter((e) => e.date === selectedDate).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const dayTodos = todos.filter((t) => t.dueDate === selectedDate);
  if (!dayEvents.length && !dayTodos.length) items.appendChild(emptyItem("이 날은 비어 있어요. 아래에서 추가해 보세요"));
  dayEvents.forEach((ev) => {
    const li = el("li");
    const box = el("div", { className: "grow" });
    box.append(el("span", { className: "tag" }, "일정"), " ", el("span", null, (ev.time ? ev.time + " " : "") + ev.title));
    const del = el("button", { className: "danger" }, "삭제");
    del.onclick = () => {
      if (!confirm("정말 삭제할까요?")) return;
      events = events.filter((x) => x.id !== ev.id);
      refresh(); toast("삭제했어요");
    };
    li.append(box, del);
    items.appendChild(li);
  });
  dayTodos.forEach((t) => {
    const li = todoItem(t);
    li.insertBefore(el("span", { className: "tag todo" }, "할 일"), li.children[1]);
    items.appendChild(li);
  });
}

// ---------- 메모 ----------
$("memo-new").onclick = () => openMemo(null);
$("memo-search").oninput = renderMemos;
$("memo-content").oninput = updateCount;
// 저장하지 않고 닫으려 할 때 확인 (닫기 버튼 · Esc 키 공통)
let memoSnapshot = "";
function memoNow() { return $("memo-title").value + "\u0000" + $("memo-content").value; }
function closeMemo() {
  if (memoNow() !== memoSnapshot && !confirm("저장하지 않은 내용이 있어요. 그래도 닫을까요?")) return;
  $("memo-dialog").close();
}
$("memo-close").onclick = closeMemo;
$("memo-dialog").addEventListener("cancel", (e) => { e.preventDefault(); closeMemo(); });
// Ctrl+S 로 저장
$("memo-dialog").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); $("memo-save").click(); }
});
function updateCount() { $("memo-count").textContent = $("memo-content").value.length + "자"; }
function openMemo(id) {
  currentMemoId = id;
  const m = memos.find((x) => x.id === id);
  $("memo-title").value = m ? m.title : "";
  $("memo-content").value = m ? m.content : "";
  $("memo-delete").classList.toggle("hidden", !m);
  updateCount();
  memoSnapshot = memoNow();
  $("memo-dialog").showModal();
  $("memo-title").focus();
}
$("memo-save").onclick = () => {
  const title = $("memo-title").value.trim();
  const content = $("memo-content").value;
  if (!title && !content.trim()) { alert("제목이나 내용을 입력해 주세요."); return; }
  if (currentMemoId) {
    const m = memos.find((x) => x.id === currentMemoId);
    m.title = title; m.content = content; m.updatedAt = nowStr();
  } else {
    memos.unshift({ id: Store.newId("m"), title, content, summary: "", createdAt: nowStr(), updatedAt: nowStr() });
  }
  $("memo-dialog").close();
  refresh(); toast("저장했어요");
};
$("memo-delete").onclick = () => {
  if (!confirm("정말 삭제할까요?")) return;
  memos = memos.filter((x) => x.id !== currentMemoId);
  $("memo-dialog").close();
  refresh(); toast("삭제했어요");
};
function renderMemos() {
  const q = $("memo-search").value.trim().toLowerCase();
  const list = $("memo-list");
  list.replaceChildren();
  // 최근에 만든 메모가 위로 오도록 정렬
  const shown = memos
    .filter((m) => (m.title + " " + m.content).toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!shown.length) list.appendChild(emptyItem(q ? "검색 결과가 없어요" : "첫 메모를 만들어 보세요"));
  shown.forEach((m) => {
    const li = el("li");
    li.appendChild(el("strong", null, m.title || "(제목 없음)"));
    li.appendChild(el("div", { className: "preview" }, m.content.trim() || "내용 없음"));
    li.appendChild(el("small", null, m.createdAt.slice(0, 10)));
    li.onclick = () => openMemo(m.id);
    list.appendChild(li);
  });
}

function renderAll() { renderToday(); renderTodos(); renderCalendar(); renderMemos(); }
renderAll();
