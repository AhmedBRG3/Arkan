// components/ProjectEditPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/OrderListPage.css";

const API_BASE = "https://arkanaltafawuq.com/arkan-system";
const api = (p) => `${API_BASE}/${String(p).replace(/^\/+/, "")}`;

const ProjectEditPage = ({ isSidebarOpen }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [project, setProject] = useState(null);
  const [form, setForm] = useState({
    status: "new",
    notes: "",
  });
  const [files, setFiles] = useState({
    "3d": null,
    prova: null,
    brief: null,
    quotation: null,
    photos: null,
    invoice: null,
  });

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(api(`projects_get.php?id=${encodeURIComponent(id)}`));
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to load");
      setProject(data.project);
      setForm({
        status: data.project.status || "new",
        notes: data.project?.notes || "",
      });
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async (overrides = {}) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const effective = { ...form, ...overrides };
      // Update only status and notes
      {
        const res = await fetch(api("projects_update.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            id: Number(id),
            status: effective.status,
            note: effective.notes,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Save failed");
      }
      // Upload files if any
      {
        const tasks = [];
        ["3d", "prova", "brief", "quotation", "photos", "invoice"].forEach((t) => {
          const f = files[t];
          if (f) tasks.push(uploadOne(t, f));
        });
        if (tasks.length > 0) await Promise.all(tasks);
      }
      setSuccess("All changes saved.");
      setFiles({ "3d": null, prova: null, brief: null, quotation: null, photos: null, invoice: null });
      await fetchProject();
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles((prev) => ({ ...prev, [name]: fileList[0] || null }));
  };

  const uploadOne = async (type, file) => {
    const fd = new FormData();
    fd.append("project_id", String(id));
    fd.append("file_type", type);
    fd.append("file", file);
    const res = await fetch(api("projects_upload_file.php"), { method: "POST", body: fd });
    let ok = res.ok;
    try {
      const data = await res.json();
      ok = ok && data?.success;
    } catch (_) { /* ignore */ }
    if (!ok) throw new Error("Upload failed");
  };

  const renderFilesList = (type) => {
    const items = Array.isArray(project?.files?.[type]) ? project.files[type] : [];
    return (
      <ul style={{ margin: "6px 0 0 16px" }}>
        {items.length === 0 ? <li style={{ color: "#999" }}>No files</li> : null}
        {items.map((f, idx) => {
          const href = f.path ? `${API_BASE}/${f.path}` : `${API_BASE}/${f}`;
          const name = f.name || f.path || f;
          return (
            <li key={`${type}-${idx}`}>
              <a href={href} target="_blank" rel="noreferrer">{name}</a>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className={`order-page ${isSidebarOpen ? "shifted" : ""}`}>
      <h2 className="order-title">Edit Project #{id}</h2>
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="status-buttons" style={{ marginBottom: 16 }}>
        <button className="form-button refresh-button" onClick={fetchProject}>
          <span className="button-icon">🔄</span> Refresh
        </button>
        <button className="form-button cancel-button" onClick={() => navigate(-1)}>
          ⬅ Back
        </button>
      </div>

      {loading || !project ? (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      ) : (
        <>
          <div className="form-group">
            <div className="form-field">
              <label className="form-label">Status</label>
              <div className="status-buttons" style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["new","design phase","Cancelled","Pending","Approved","In Process ","Completed"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`status-button ${form.status === s ? "active" : ""}`}
                    title={`Set status to ${s} and save`}
                    onClick={() => saveAll({ status: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                value={form.notes || ""}
                onChange={handleChange}
                className="form-input"
                placeholder="Notes"
                style={{ resize: "vertical", minHeight: 80 }}
              />
            </div>
            <div className="form-buttons">
              <button className="form-button submit-button" onClick={saveAll} disabled={saving}>
                {saving ? <span className="spinner"></span> : "Save"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <h3 className="order-title" style={{ margin: 0, fontSize: 18 }}>Files</h3>
            {["3d", "prova", "brief", "quotation", "photos", "invoice"].map((t) => (
              <div key={t} className="form-field">
                <label className="form-label" style={{ textTransform: "uppercase" }}>{t}</label>
                {renderFilesList(t)}
                <input type="file" name={t} onChange={handleFileChange} className="form-input" />
              </div>
            ))}
            <div className="form-buttons">
              <button className="form-button approve-button" onClick={saveAll} disabled={saving}>
                {saving ? <span className="spinner"></span> : "Upload Selected Files"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectEditPage;
