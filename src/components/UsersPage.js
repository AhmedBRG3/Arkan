import React, { useEffect, useState } from "react";

const API_BASE = "https://arkanaltafawuq.com/arkan-system";
const api = {
  list:   `${API_BASE}/users_list.php`,
  create: `${API_BASE}/users_create.php`,
  update: `${API_BASE}/users_update.php`,   // NEW
  remove: `${API_BASE}/users_delete.php`,   // NEW
};

const Roles = [
  "admin",
  "finance",
  "production",
  "account manager",
  // "designer",
  // "designer manager",
];

export default function UsersPage({ isSidebarOpen }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "finance",
    email: "",
    phone: "",
  });

  // NEW: inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    password: "", // leave blank to keep current password
    role: "finance",
    email: "",
    phone: "",
  });

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(api.list);
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Failed to load users");
      setUsers(j.users || []);
    } catch (e) {
      setError(e.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function createUser(e) {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password || !form.role) {
      setError("Please fill username, password and role.");
      return;
    }
    if (form.password.length < 3) {
      setError("Password must be at least 3 characters (for now).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(api.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Create failed");
      setForm({ username: "", password: "", role: "finance", email: "", phone: "" });
      fireToast("✅ User created");
      loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // NEW: start edit
  function startEdit(u) {
    setEditingId(u.id);
    setEditForm({
      username: u.username || "",
      password: "",
      role: u.role || "finance",
      email: u.email || "",
      phone: u.phone || "",
    });
  }

  // NEW: cancel edit
  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      username: "",
      password: "",
      role: "finance",
      email: "",
      phone: "",
    });
  }

  // NEW: save edit (password optional; leave blank to keep unchanged)
  async function saveEdit(id) {
    setError("");
    if (!editForm.username || !editForm.role) {
      setError("Please fill username and role.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(api.update, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Update failed");
      fireToast("✅ User updated");
      cancelEdit();
      loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // NEW: delete user
  async function deleteUser(id) {
    if (!window.confirm("Delete this user?")) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(api.remove, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Delete failed");
      fireToast("🗑️ User deleted");
      loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function fireToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  return (
    <div className={`users-wrap ${isSidebarOpen ? "shifted" : ""}`}>
      <header className="top">
        <h1>👤 User Management</h1>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="card">
        <h3>Create New User</h3>
        <form onSubmit={createUser} className="grid">
          <div className="field">
            <label>Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. finance1"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••"
              required
            />
          </div>
          <div className="field">
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
            >
              {Roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@arkan.com"
            />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0100 000 0000"
            />
          </div>
          <div className="actions">
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Users</h3>
          <button className="ghost" onClick={loadUsers} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th><th>Username</th><th>Role</th><th>Email</th><th>Phone</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading && (
                <tr><td colSpan="6" className="center muted">No users</td></tr>
              )}

              {users.map(u => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>

                    <td>
                      {isEditing ? (
                        <input
                          value={editForm.username}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        />
                      ) : (
                        u.username
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        >
                          {Roles.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      ) : (
                        u.email || "-"
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      ) : (
                        u.phone || "-"
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="password"
                            placeholder="(leave blank to keep)"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            style={{ height: 30, padding: "0 8px", borderRadius: 8, border: "1px solid var(--bd)" }}
                          />
                          <button className="primary" onClick={() => saveEdit(u.id)} disabled={saving}>
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button className="ghost" onClick={cancelEdit}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="ghost" onClick={() => startEdit(u)}>Edit</button>
                          <button className="ghost" onClick={() => deleteUser(u.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {toast && <div className="toast">{toast}</div>}

      <style>{`
        :root { --bg:#f7f8fb; --card:#fff; --bd:#e9eef5; --muted:#6b7280; --pri:#2563eb; }
        .users-wrap { padding:16px; max-width:1100px; margin:0 auto; background:var(--bg); min-height:100vh; }
        .top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .card { background:var(--card); border:1px solid var(--bd); border-radius:14px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,.03); margin-bottom:14px; }
        .card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .field input, .field select { height:40px; border:1px solid var(--bd); border-radius:10px; padding:0 12px; background:#fff; }
        .field label { font-size:12px; color:var(--muted); }
        .actions { display:flex; align-items:end; }
        .primary { background:var(--pri); color:#fff; border:0; border-radius:10px; height:40px; padding:0 18px; cursor:pointer; }
        .ghost { background:transparent; border:1px solid var(--bd); border-radius:10px; height:34px; padding:0 10px; cursor:pointer; }
        .table-wrap { overflow:auto; }
        .tbl { width:100%; border-collapse: collapse; }
        .tbl th, .tbl td { border-bottom:1px solid var(--bd); padding:10px; font-size:14px; }
        .tbl th { text-align:left; color:var(--muted); font-weight:700; }
        .center { text-align:center; }
        .muted { color:var(--muted); }
        .alert { background:#fff1f2; border:1px solid #ffe4e6; color:#991b1b; padding:10px 12px; border-radius:10px; margin-bottom:10px; }
        .toast {
          position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
          background: #111827; color: #fff; padding: 10px 14px; border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,.25); opacity: 0;
          animation: pop 0.2s ease-out forwards, fade 2s ease-out forwards;
        }
        @keyframes pop { to { opacity: 1; transform: translateX(-50%) scale(1.02); } }
        @keyframes fade { 0%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
        @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
