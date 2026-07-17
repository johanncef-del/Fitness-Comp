import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://aoqkcdwuplhykblbxehz.supabase.co",
  "sb_publishable_5SUVzN5hNxXEUtK6kEMzVw_2T9NpUgO"
);

const PLAYERS = ["Johannce", "Avrill", "Bliss"];

const ACTIVITIES = [
  { label: "Morning Gym / Sport", points: 3, emoji: "🌅" },
  { label: "Afternoon Gym / Sport", points: 2, emoji: "☀️" },
  { label: "15 Min Cardio", points: 1, emoji: "🏃" },
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PLAYER_COLORS = {
  Johannce: { bg: "#2563eb", light: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", badge: "#dbeafe" },
  Avrill: { bg: "#059669", light: "#ecfdf5", border: "#a7f3d0", text: "#047857", badge: "#d1fae5" },
  Bliss: { bg: "#7c3aed", light: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9", badge: "#ede9fe" },
};

const RANK_ICONS = ["🥇", "🥈", "🥉"];

function getMonthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function getMonthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_NAMES[month]} ${year}`;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMonth, setViewMonth] = useState(getMonthKey(new Date()));
  const [form, setForm] = useState({ player: PLAYERS[0], activity: 0, date: getTodayStr(), note: "" });
  const [tab, setTab] = useState("leaderboard");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchEntries() {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("logged_at", { ascending: false });
    if (!error) setEntries(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchEntries();
    const channel = supabase
      .channel("entries-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "entries" }, () => fetchEntries())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function addEntry() {
    setSubmitting(true);
    const activity = ACTIVITIES[form.activity];
    const d = new Date(form.date + "T12:00:00");
    const { error } = await supabase.from("entries").insert({
      player: form.player,
      activity: activity.label,
      points: activity.points,
      date: form.date,
      note: form.note.trim(),
      proof_verified: false,
      month_key: getMonthKey(d),
      logged_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) { showToast("Something went wrong", "error"); return; }
    setForm(f => ({ ...f, note: "", date: getTodayStr() }));
    showToast(`+${activity.points} pts logged for ${form.player}!`);
    setTab("leaderboard");
  }

  async function toggleProof(id, current) {
    await supabase.from("entries").update({ proof_verified: !current }).eq("id", id);
    fetchEntries();
  }

  async function deleteEntry(id) {
    await supabase.from("entries").delete().eq("id", id);
    setConfirmDelete(null);
    showToast("Entry removed", "error");
  }

  const allMonthKeys = Array.from(
    new Set([getMonthKey(new Date()), ...entries.map(e => e.month_key)])
  ).sort((a, b) => b.localeCompare(a));

  const monthEntries = entries.filter(e => e.month_key === viewMonth);

  const scores = PLAYERS.map(player => {
    const pe = monthEntries.filter(e => e.player === player);
    const total = pe.reduce((sum, e) => sum + e.points, 0);
    const verified = pe.filter(e => e.proof_verified).reduce((sum, e) => sum + e.points, 0);
    return { player, total, verified, count: pe.length };
  }).sort((a, b) => b.total - a.total);

  const daysLeft = Math.max(0, Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) - new Date()) / (1000 * 60 * 60 * 24)));

  const styles = {
    app: { minHeight: "100vh", background: "#030712", color: "#f9fafb", fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 40 },
    header: { background: "#111827", borderBottom: "1px solid #1f2937", padding: "20px 16px" },
    inner: { maxWidth: 600, margin: "0 auto" },
    h1: { fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 },
    sub: { fontSize: 12, color: "#6b7280", marginTop: 4 },
    daysNum: { fontSize: 28, fontWeight: 900, color: "#fff", textAlign: "right" },
    daysLabel: { fontSize: 11, color: "#6b7280", textAlign: "right" },
    monthRow: { display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" },
    pill: (active) => ({ padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", background: active ? "#fff" : "#1f2937", color: active ? "#111" : "#9ca3af" }),
    tabs: { display: "flex", gap: 4, background: "#111827", borderRadius: 14, padding: 4, marginBottom: 24 },
    tab: (active) => ({ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", background: active ? "#fff" : "transparent", color: active ? "#111" : "#9ca3af" }),
    card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 20, marginBottom: 16 },
    label: { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 8 },
    input: { width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 14, boxSizing: "border-box", outline: "none" },
    btn: (bg, color) => ({ width: "100%", background: bg, color: color, fontWeight: 700, padding: "14px 0", borderRadius: 12, border: "none", fontSize: 14, cursor: "pointer" }),
    playerBtn: (active, color) => ({ flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, border: active ? "none" : "1px solid #374151", background: active ? color : "#1f2937", color: active ? "#fff" : "#9ca3af", cursor: "pointer" }),
    actBtn: (active) => ({ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, border: active ? "none" : "1px solid #374151", background: active ? "#fff" : "#1f2937", color: active ? "#111" : "#d1d5db", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 8 }),
  };

  return (
    <div style={styles.app}>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50, padding: "12px 18px", borderRadius: 12, background: toast.type === "error" ? "#dc2626" : "#10b981", color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      <div style={styles.header}>
        <div style={{ ...styles.inner, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={styles.h1}>💪 Fitness Comp</h1>
            <p style={styles.sub}>Johannce · Avrill · Bliss — Loser buys the meal</p>
          </div>
          <div>
            <div style={styles.daysNum}>{daysLeft}</div>
            <div style={styles.daysLabel}>days left</div>
          </div>
        </div>
        <div style={{ ...styles.inner }}>
          <div style={styles.monthRow}>
            {allMonthKeys.map(key => (
              <button key={key} onClick={() => setViewMonth(key)} style={styles.pill(viewMonth === key)}>{getMonthLabel(key)}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...styles.inner, padding: "24px 16px 0" }}>
        <div style={styles.tabs}>
          {["leaderboard", "log", "history"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={styles.tab(tab === t)}>
              {t === "leaderboard" ? "🏆 Board" : t === "log" ? "➕ Log" : "📋 History"}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: "#6b7280", textAlign: "center" }}>Loading...</p>}

        {!loading && tab === "leaderboard" && (
          <div>
            {scores.map(({ player, total, verified, count }, i) => {
              const c = PLAYER_COLORS[player];
              const isLoser = i === scores.length - 1 && scores[0].total > 0;
              const maxPts = scores[0].total || 1;
              return (
                <div key={player} style={{ ...styles.card, border: `1px solid ${c.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{RANK_ICONS[i]}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: 18 }}>{player}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{count} activit{count === 1 ? "y" : "ies"} · {verified} verified pts</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 40, fontWeight: 900, color: c.text }}>{total}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>points</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, height: 8, background: "#1f2937", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: c.bg, borderRadius: 999, width: `${(total / maxPts) * 100}%`, transition: "width 0.5s" }} />
                  </div>
                  {isLoser && total > 0 && (
                    <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, background: "#450a0a", border: "1px solid #7f1d1d", color: "#f87171", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999 }}>
                      🍽️ Buying dinner
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ ...styles.card, marginTop: 8 }}>
              <span style={styles.label}>Points Key</span>
              {ACTIVITIES.map(a => (
                <div key={a.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: "#d1d5db" }}>{a.emoji} {a.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === "log" && (
          <div style={styles.card}>
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginTop: 0 }}>Log an activity</h2>
            <span style={styles.label}>Who?</span>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {PLAYERS.map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, player: p }))} style={styles.playerBtn(form.player === p, PLAYER_COLORS[p].bg)}>{p}</button>
              ))}
            </div>
            <span style={styles.label}>Activity</span>
            {ACTIVITIES.map((a, i) => (
              <button key={a.label} onClick={() => setForm(f => ({ ...f, activity: i }))} style={styles.actBtn(form.activity === i)}>
                <span>{a.emoji} {a.label}</span>
                <span style={{ fontWeight: 700 }}>{a.points} pts</span>
              </button>
            ))}
            <span style={{ ...styles.label, marginTop: 12 }}>Date</span>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...styles.input, marginBottom: 16 }} />
            <span style={styles.label}>Note (optional)</span>
            <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. 5k run, chest day..." style={{ ...styles.input, marginBottom: 20 }} />
            <button onClick={addEntry} disabled={submitting} style={styles.btn("#fff", "#111")}>
              {submitting ? "Logging..." : `+ Log ${ACTIVITIES[form.activity].points} pts for ${form.player}`}
            </button>
            <p style={{ fontSize: 12, color: "#4b5563", textAlign: "center", marginTop: 12 }}>Post your proof pic in the group chat — admin verifies it in History.</p>
          </div>
        )}

        {!loading && tab === "history" && (
          <div>
            <p style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{getMonthLabel(viewMonth)} — {monthEntries.length} entr{monthEntries.length === 1 ? "y" : "ies"}</p>
            {monthEntries.length === 0 && <p style={{ color: "#4b5563", textAlign: "center", paddingTop: 40 }}>No entries yet.</p>}
            {monthEntries.map(entry => {
              const c = PLAYER_COLORS[entry.player];
              const activity = ACTIVITIES.find(a => a.label === entry.activity);
              return (
                <div key={entry.id} style={{ ...styles.card, border: entry.proof_verified ? "1px solid #065f46" : "1px solid #1f2937" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{activity?.emoji || "💪"}</span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: c.badge, color: c.text }}>{entry.player}</span>
                          <span style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{entry.activity}</span>
                          <span style={{ color: "#6b7280", fontSize: 12 }}>+{entry.points} pts</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{entry.date}{entry.note ? ` · ${entry.note}` : ""}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => setConfirmDelete(entry.id)} style={{ background: "none", border: "none", color: "#374151", cursor: "pointer", fontSize: 13 }}>✕</button>
                      <button onClick={() => toggleProof(entry.id, entry.proof_verified)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, fontWeight: 600, cursor: "pointer", border: entry.proof_verified ? "1px solid #065f46" : "1px solid #374151", background: entry.proof_verified ? "#022c22" : "#1f2937", color: entry.proof_verified ? "#34d399" : "#6b7280" }}>
                        {entry.proof_verified ? "✓ Verified" : "Verify proof"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 18, padding: 24, maxWidth: 360, width: "100%" }}>
            <h3 style={{ color: "#fff", fontWeight: 700, marginTop: 0 }}>Remove this entry?</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>This can't be undone.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 12, borderRadius: 12, background: "#1f2937", color: "#d1d5db", border: "none", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => deleteEntry(confirmDelete)} style={{ flex: 1, padding: 12, borderRadius: 12, background: "#dc2626", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
