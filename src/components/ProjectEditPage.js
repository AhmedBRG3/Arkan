// components/ProjectEditPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/OrderListPage.css";
import { COUNTRIES_STATES } from "../static/countries";
// Minimal country → states for demo, should be imported or defined elsewhere for production


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
  // UI helpers for a modern look-and-feel
  const cardStyle = { background: "#fff", border: "1px solid #e6e6f0", borderRadius: 12, padding: 16, boxShadow: "0 4px 14px rgba(16,24,40,0.08)", marginBottom: 16 };
  const sectionTitleStyle = { margin: "0 0 12px 0", fontSize: 18, fontWeight: 700, color: "#1f2937" };
  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 };
  const inputStyle = { borderRadius: 10 };
  const actionBarStyle = { position: "sticky", top: 0, zIndex: 5, background: "#fff", padding: "10px 0", marginBottom: 16, borderBottom: "1px solid #ececf1", display: "flex", alignItems: "center", justifyContent: "space-between" };
  const primaryBtnStyle = { background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" };
  const ghostBtnStyle = { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", cursor: "pointer" };
  const [form, setForm] = useState({
    company_name: "",
    name: "",
    Response_name: "",
    job_no: "",
    status: "new",
    install_date: "",
    production_date: "",
    event_date: "",
    disassembly_date: "",
    notes: "",
    country: "",
    state: "",
    location_details: "",
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
        company_name: data.project.company_name || "", 
        name: data.project.name || "",
        Response_name: data.project.Response_name || "",
        job_no: data.project.job_no || "",
        status: data.project.status || "new",
        install_date: data.project?.dates?.install_date || "",
        install_end_date: data.project?.dates?.install_end_date || "",
        production_date: data.project?.dates?.production_date || "",
        production_end_date: data.project?.dates?.production_end_date || "",
        event_date: data.project?.dates?.event_date || "",
        event_end_date: data.project?.dates?.event_end_date || "",
        remove_date: data.project?.dates?.remove_date || "",
        remove_end_date: data.project?.dates?.remove_end_date || "",
        disassembly_date: data.project?.dates?.disassembly_date || "",
        notes: data.project?.notes || "",
        country: data.project?.location?.country || "",
        state: data.project?.location?.state || "",
        location_details: data.project?.location?.details || "",
      });

            // Try fetching location details explicitly (if backend separates it)
            try {
              const locRes = await fetch(api(`Project_get_location.php?project_id=${encodeURIComponent(id)}`));
              const locData = await locRes.json();
              if (locData?.success && locData.location) {
                setForm((prev) => ({
                  ...prev,
                  country: locData.location.country || prev.country || "",
                  state: locData.location.state || prev.state || "",
                  location_details: locData.location.details || prev.location_details || "",
                }));
              }
            } catch (_) {
              // ignore location fetch errors; form already initialized from main payload if available
            }
            
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
      // 1) Update basic fields + location
      {
        const res = await fetch(api("projects_update.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            id: Number(id),
            company_name: effective.company_name,
            name: effective.name,
            Response_name: effective.Response_name,
            job_no: effective.job_no,
            status: effective.status,
            note: effective.notes,
            country: effective.country || "",
            state: effective.state || "",
            location_details: effective.location_details || "",
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

  const handleLocationCountryChange = (e) => {
    const country = e.target.value;
    setForm((prev) => ({
      ...prev,
      country: country,
      state: "", // reset state on country change
    }));
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

  const formatForInput = (value) => {
    if (!value) return "";
    // If already date-only, append midnight time
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`;
    // Normalize common "YYYY-MM-DD HH:MM:SS" to "YYYY-MM-DDTHH:MM"
    const normalized = value.replace(" ", "T");
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) return normalized.slice(0, 16);
    // Fallback: try Date parsing and format as local
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const pad2 = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
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
      <div style={actionBarStyle}>
        <h2 className="order-title" style={{ margin: 0 }}>
          <span role="img" aria-label="edit" style={{ marginRight: 8 }}>📝</span>
          <strong>Edit Project</strong>{" "}
          <span style={{ color: "#6b7280", fontWeight: 500 }}>#{id}</span>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={ghostBtnStyle} onClick={fetchProject}><span className="button-icon">🔄</span> Refresh</button>
          <button style={primaryBtnStyle} onClick={() => navigate(-1)}>⬅ Back</button>
        </div>
      </div>
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">{success}</div>}

      {loading || !project ? (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      ) : (
        <>
          <div style={gridStyle}>
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Basic Info</h3>
    
              <div className="form-field">
              <label className="form-label">Project Name</label>
              <input className="form-input" name="name" value={form.name} onChange={handleChange} style={inputStyle} />
              </div>
              <div className="form-field">
              <label className="form-label">Company Name</label>
              <input className="form-input" name="company_name" value={form.company_name} onChange={handleChange} style={inputStyle} />
              </div>
              <div className="form-field">
              <label className="form-label">Responsible</label>
              <input className="form-input" name="Response_name" value={form.Response_name} onChange={handleChange} style={inputStyle} />
              </div>
              <div className="form-field">
              <label className="form-label">Job No</label>
              <input className="form-input" name="job_no" value={form.job_no} onChange={handleChange} style={inputStyle} />
              </div>
              <div className="form-field">
              <label className="form-label">Status</label>
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

              {/* Location Fields */}
              <div className="form-field" style={{border: "1px solid #ddd", borderRadius: 10, margin: "12px 0", padding: 12, background: "#fafcff"}}>
              <h3 style={{margin: "0 0 10px 0"}}>Location</h3>
              <div className="form-field">
                <label className="form-label">Country</label>
                <select
                  name="country"
                  value={form.country || ""}
                  onChange={handleLocationCountryChange}
                  className="form-select"
                  style={inputStyle}
                >
                  <option value="">Select country</option>
                  {Object.keys(COUNTRIES_STATES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">State</label>
                <select
                  name="state"
                  value={form.state || ""}
                  onChange={handleChange}
                  className="form-select"
                  disabled={!form.country}
                  style={inputStyle}
                >
                  <option value="">{form.country ? "Select state" : "Select country first"}</option>
                  {(COUNTRIES_STATES[form.country] || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Details</label>
                <textarea
                  name="location_details"
                  value={form.location_details || ""}
                  className="form-input"
                  style={{ resize: "vertical", minHeight: 56 }}
                  onChange={handleChange}
                  placeholder="Location details, address, venue..."
                />
              </div>
              </div>
              {/* End Location Fields */}

              <div className="form-buttons">
                <button className="form-button submit-button" onClick={saveAll} disabled={saving}>
                  {saving ? <span className="spinner"></span> : "Save Basic"}
                </button>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Dates</h3>
            <div className="form-field">
              <label className="form-label">Install Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="install_date"
                value={formatForInput(form.install_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Install End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="install_end_date"
                value={formatForInput(form.install_end_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Production Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="production_date"
                value={formatForInput(form.production_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Production End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="production_end_date"
                value={formatForInput(form.production_end_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Event Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="event_date"
                value={formatForInput(form.event_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Event End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="event_end_date"
                value={formatForInput(form.event_end_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-field">
              <label className="form-label">OFF Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="remove_date"
                value={formatForInput(form.remove_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-field">
              <label className="form-label">OFF End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="remove_end_date"
                value={formatForInput(form.remove_end_date)}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div className="form-buttons">
              <button className="form-button submit-button" onClick={saveAll} disabled={saving}>
                {saving ? <span className="spinner"></span> : "Save Dates"}
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 className="order-title" style={{ margin: 0, fontSize: 18 }}>Files</h3>
            {["3d", "prova", "brief", "quotation", "photos", "invoice"].map((t) => (
              <div key={t} className="form-field">
                <label className="form-label" style={{ textTransform: "uppercase" }}>{t}</label>
                {renderFilesList(t)}
                <input type="file" name={t} onChange={handleFileChange} className="form-input" style={inputStyle} />
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
