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
    name: "",
    Response_name: "",
    job_no: "",
    status: "new",
    install_date: "",
    production_date: "",
    event_date: "",
    disassembly_date: "",
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
        name: data.project.name || "",
        Response_name: data.project.Response_name || "",
        job_no: data.project.job_no || "",
        status: data.project.status || "new",
        install_date: data.project?.dates?.install_date || "",
        production_date: data.project?.dates?.production_date || "",
        event_date: data.project?.dates?.event_date || "",
        disassembly_date: data.project?.dates?.disassembly_date || "",
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
      // 1) Update basic fields
      {
        const res = await fetch(api("projects_update.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            id: Number(id),
            name: effective.name,
            Response_name: effective.Response_name,
            job_no: effective.job_no,
            status: effective.status,
            note: effective.notes,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Save basic failed");
      }

      // 2) Upsert dates
      {
        const res = await fetch(api("projects_dates_upsert.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            project_id: Number(id),
            install_date: effective.install_date || null,
            production_date: effective.production_date || null,
            event_date: effective.event_date || null,
            remove_date: effective.remove_date || null,
            install_end_date: effective.install_end_date || null,
            production_end_date: effective.production_end_date || null,
            event_end_date: effective.event_end_date || null,
            remove_end_date: effective.remove_end_date || null,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Save dates failed");
      }

      // 3) Upload any selected files (if provided)
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
              <label className="form-label">Name</label>
              <input className="form-input" name="name" value={form.name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label">Responsible</label>
              <input className="form-input" name="Response_name" value={form.Response_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label">Job No</label>
              <input className="form-input" name="job_no" value={form.job_no} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label">Status</label>
              {/* <select className="form-select" name="status" value={form.status} onChange={handleChange}>
              <option value="new">new</option>
              <option value="design phase">design phase</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Pending">Pending</option>
              <option value="In Deployment">In Deployment</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              </select> */}
              <div className="status-buttons" style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["new","design phase","Cancelled","Pending","In Deployment","Approved","Completed"].map((s) => (
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
                {saving ? <span className="spinner"></span> : "Save Basic"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <div className="form-field">
              <label className="form-label">Install Start Date</label>
              <input
                type="date"
                className="form-input"
                name="install_date"
                value={form.install_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Install End Date</label>
              <input
                type="date"
                className="form-input"
                name="install_end_date"
                value={form.install_end_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Production Start Date</label>
              <input
                type="date"
                className="form-input"
                name="production_date"
                value={form.production_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Production End Date</label>
              <input
                type="date"
                className="form-input"
                name="production_end_date"
                value={form.production_end_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Event Start Date</label>
              <input
                type="date"
                className="form-input"
                name="event_date"
                value={form.event_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Event End Date</label>
              <input
                type="date"
                className="form-input"
                name="event_end_date"
                value={form.event_end_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Disassembly Start Date</label>
              <input
                type="date"
                className="form-input"
                name="remove_date"
                value={form.remove_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Disassembly End Date</label>
              <input
                type="date"
                className="form-input"
                name="remove_end_date"
                value={form.remove_end_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-buttons">
              <button className="form-button submit-button" onClick={saveAll} disabled={saving}>
                {saving ? <span className="spinner"></span> : "Save Dates"}
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


