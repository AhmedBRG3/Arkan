// components/CreateOrderPage.jsx
import React, { useState } from "react";
import "../styles/CreateOrderPage.css";
import { COUNTRIES_STATES } from "../static/countries";

const CreateOrderPage = ({ isSidebarOpen }) => {
  const [form, setForm] = useState({
    company_name: "",
    name: "",
    Response_name: "",
    job_no: "",
    status: "new",
    install_date: "",
    install_end_date: "",
    production_date: "",
    production_end_date: "",
    event_date: "",
    event_end_date: "",
    remove_date: "",
    remove_end_date: "",
  });
  const [files, setFiles] = useState({
    "3d": null,
    prova: null,
    brief: null,
    quotation: null,
    photos: null,
    invoice: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles((prev) => ({ ...prev, [name]: fileList[0] || null }));
  };

  const resetForm = () => {
    setForm({
      company_name: "",
      name: "",
      Response_name: "",
      job_no: "",
      status: "new",
      install_date: "",
      install_end_date: "",
      production_date: "",
      production_end_date: "",
      event_date: "",
      event_end_date: "",
      remove_date: "",
      remove_end_date: "",
    });
    setFiles({
      "3d": null,
      prova: null,
      brief: null,
      quotation: null,
      photos: null,
      invoice: null,
    });
    setError("");
    setSuccess("");
    document.querySelectorAll('input[type="file"]').forEach((i) => (i.value = ""));
  };

  const createProject = async () => {
    const res = await fetch("https://arkanaltafawuq.com/arkan-system/projects_create.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        company_name: form.company_name,
        name: form.name,
        Response_name: form.Response_name,
        job_no: form.job_no,
        status: form.status || "new",
        note: form.notes || "",
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Create project failed");
    return data.id;
  };

  const upsertDates = async (projectId) => {
    const hasAny =
      form.install_date || form.install_end_date ||
      form.production_date || form.production_end_date ||
      form.event_date || form.event_end_date ||
      form.remove_date || form.remove_end_date;
    if (!hasAny) return;
    const res = await fetch("https://arkanaltafawuq.com/arkan-system/projects_dates_upsert.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        install_date: form.install_date || null,
        install_end_date: form.install_end_date || null,
        production_date: form.production_date || null,
        production_end_date: form.production_end_date || null,
        event_date: form.event_date || null,
        event_end_date: form.event_end_date || null,
        remove_date: form.remove_date || null,
        remove_end_date: form.remove_end_date || null,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Saving dates failed");
  };

  const uploadOne = async (projectId, type, file) => {
    const fd = new FormData();
    fd.append("project_id", String(projectId));
    fd.append("file_type", type);
    fd.append("file", file);
    const res = await fetch("https://arkanaltafawuq.com/arkan-system/projects_upload_file.php", {
      method: "POST",
      body: fd,
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (!data.success) throw new Error(data.message || "Upload failed");
    } catch {
      // fallback if server returns text
      if (!res.ok) throw new Error("Upload failed");
    }
  };

  const addLocation = async (projectId) => {
    const res = await fetch("https://arkanaltafawuq.com/arkan-system/project_add_location.php", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        location: form.location,
        country: form.country,
        state: form.state,
        details: form.details,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Adding location failed");
    return data.id;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name || !form.Response_name) {
      setError("Project name and Responsible name are required.");
      return;
    }

    setLoading(true);
    try {
      const projectId = await createProject();
      await upsertDates(projectId);
      await addLocation(projectId);
      const uploads = [];
      ["3d", "prova", "brief", "quotation", "photos", "invoice"].forEach((t) => {
        const f = files[t];
        if (f) uploads.push(uploadOne(projectId, t, f));
      });
      if (uploads.length > 0) {
        await Promise.all(uploads);
      }

      setSuccess("✅ Project created successfully.");
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`order-page ${isSidebarOpen ? "shifted" : ""}`}>
      <h2 className="order-title">Create New Project</h2>
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form className="form-group" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label">Company Name</label>
          <input
            type="text"
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            className="form-input"
            placeholder="Company name"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Project Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="form-input"
            placeholder="Project name"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Responsible Name</label>
          <input
            type="text"
            name="Response_name"
            value={form.Response_name}
            onChange={handleChange}
            className="form-input"
            placeholder="Responsible person"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Job No</label>
          <input
            type="text"
            name="job_no"
            value={form.job_no}
            onChange={handleChange}
            className="form-input"
            placeholder="001"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="form-select"
          >
            <option value="new">new</option>
            <option value="design phase">design phase</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Pending">Pending</option>
            <option value="In Deployment">In Deployment</option>
            <option value="Approved">Approved</option>
            <option value="Completed">Completed</option>
          </select>
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

        <div className="form-field">
          <card>
            <h3>Location</h3>              
            <div className="form-field">
          <label className="form-label">Country</label>
          <select
            name="country"
            value={form.country || ""}
            onChange={(e) => {
              const value = e.target.value;
              setForm((prev) => ({
                ...prev,
                country: value,
                state: "", // reset state on country change
              }));
            }}
            className="form-select"
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
                name="details"
                value={form.details || ""}   
                className="form-input"
                style={{ resize: "vertical", minHeight: 80 }}
                onChange={handleChange}
              />
            </div>
          </card>
        </div>

        <div className="form-group">
            <div className="form-field">
              <label className="form-label">Install Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="install_date"
                value={form.install_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Install End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="install_end_date"
                value={form.install_end_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Production Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="production_date"
                value={form.production_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Production End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="production_end_date"
                value={form.production_end_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Event Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="event_date"
                value={form.event_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Event End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="event_end_date"
                value={form.event_end_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">OFF Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="remove_date"
                value={form.remove_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label className="form-label">OFF End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                name="remove_end_date"
                value={form.remove_end_date || ""}
                onChange={handleChange}
              />
            </div>
            </div>
        <div className="form-field">
          <label className="form-label">Upload 3D File</label>
          <input type="file" name="3d" onChange={handleFileChange} className="form-input" />
        </div>
        <div className="form-field">
          <label className="form-label">Upload Prova File</label>
          <input type="file" name="prova" onChange={handleFileChange} className="form-input" />
        </div>
        <div className="form-field">
          <label className="form-label">Upload Brief File</label>
          <input type="file" name="brief" onChange={handleFileChange} className="form-input" />
        </div>
        <div className="form-field">
          <label className="form-label">Upload Quotation File</label>
          <input type="file" name="quotation" onChange={handleFileChange} className="form-input" />
        </div>
        <div className="form-field">
          <label className="form-label">Upload Photos</label>
          <input type="file" name="photos" onChange={handleFileChange} className="form-input" />
        </div>
        <div className="form-field">
          <label className="form-label">Upload Invoice File</label>
          <input type="file" name="invoice" onChange={handleFileChange} className="form-input" />
        </div>

        <div className="form-buttons">
          <button type="submit" disabled={loading} className="form-button submit-button">
            {loading ? <span className="spinner"></span> : "Create Project"}
          </button>
          <button type="button" onClick={resetForm} disabled={loading} className="form-button reset-button">
            <span className="button-icon">🔄</span> Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrderPage;
