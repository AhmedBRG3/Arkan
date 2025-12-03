// components/ProductionPoEditPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/OrderListPage.css";
import { COUNTRIES_STATES } from "../static/countries";

const API_BASE = "https://arkanaltafawuq.com/arkan-system";
const api = (p) => `${API_BASE}/${String(p).replace(/^\/+/, "")}`;

const ProductionPoEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [project, setProject] = useState(null);
  const [po, setPo] = useState({ po_no: "", po_s_date: "", po_exp_date: "", warehouse_entry_date: "" });
  const [materialsText, setMaterialsText] = useState({ available_material: "", unavailable_material: ""});
  const role = typeof window !== "undefined" ? (localStorage.getItem("role") || "") : "";
  const [poStatus, setPoStatus] = useState("none");
  const [locationForm, setLocationForm] = useState({ country: "", state: "", details: "" });
  const cardStyle = { background: "#fff", border: "1px solid #e6e6f0", borderRadius: 12, padding: 16, boxShadow: "0 4px 14px rgba(16,24,40,0.08)", marginBottom: 16 };
  const sectionTitleStyle = { margin: "0 0 12px 0", fontSize: 18, fontWeight: 700, color: "#1f2937" };
  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 };
  const inputStyle = { borderRadius: 10 };
  const actionBarStyle = { position: "sticky", top: 0, zIndex: 5, background: "#fff", padding: "10px 0", marginBottom: 16, borderBottom: "1px solid #ececf1", display: "flex", alignItems: "center", justifyContent: "space-between" };
  const statusPill = (active) => ({
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${active ? "#2563eb" : "#e5e7eb"}`,
    background: active ? "rgba(37,99,235,0.08)" : "#fff",
    color: active ? "#1e40af" : "#374151",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s",
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        // fetch project minimal info for header
        const plist = await fetch(api("projects_get.php?id=" + id)).catch(() => null);
        if (plist && plist.ok) {
          const pdata = await plist.json();
          if (pdata?.success) setProject(pdata.project || { id, name: `#${id}` });
        }
        const res = await fetch(api(`production_get_detail.php?project_id=${id}`), { credentials: "include" });
        const data = await res.json();
        if (data?.success) {
          setPo(data.po || { po_no: "", po_s_date: "", po_exp_date: "", warehouse_entry_date: "" });
          const p = data.po || {};
          setPoStatus(p.prod_status || p.po_status || p.status || "none");
          // Fetch current project location (same behavior as ProjectEditPage)
          try {
            const locRes = await fetch(api(`production_get_location.php?prod_loc_id=${encodeURIComponent(id)}`));
            const locData = await locRes.json();
            if (locData?.success && locData.location) {
              setLocationForm({
                country: locData.location.country || "",
                state: locData.location.state || "",
                details: locData.location.details || "",
              });
            }
          } catch (_) {
            // ignore
          }
          if (data.materials_text) {
            setMaterialsText({
              available_material: data.materials_text.available_material || "",
              unavailable_material: data.materials_text.unavailable_material || "",
              note: data.materials_text.note || "",
            });
          } else {
            setMaterialsText({ available_material: "", unavailable_material: "", note: "" });
          }
        } else {
          setError(data?.message || "Failed to load production details");
        }
      } catch (e) {
        setError("Failed to load production details");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const savePO = async () => {
    try {
      setLoading(true);
      setError("");
      const body = { project_id: Number(id), po_no: po.po_no, po_s_date: po.po_s_date, po_exp_date: po.po_exp_date, warehouse_entry_date: po.warehouse_entry_date, prod_status: poStatus || "none" };
      const res = await fetch(api("production_upsert_po.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Save failed");
      setSuccess("PO saved successfully");
      setTimeout(() => setSuccess(""), 3000);

    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationCountryChange = (e) => {
    const country = e.target.value;
    setLocationForm((prev) => ({ ...prev, country, state: "" }));
  };

  const saveProductionLocation = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(api("production_upsert_location.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prod_loc_id: Number(id),
          country: locationForm.country || "",
          state: locationForm.state || "",
          details: locationForm.details || "",
        }),
      });
      const text = await res.text();
      let ok = false;
      try {
        const data = JSON.parse(text);
        ok = !!data?.success;
        if (!ok) throw new Error(data?.message || "Save location failed");
      } catch (parseErr) {
        if (!res.ok) throw new Error(`Save location failed (HTTP ${res.status})`);
        ok = true;
      }
      if (ok) {
        setSuccess("Production location saved");
        setTimeout(() => setSuccess(""), 2500);
      }
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const saveMaterialsText = async () => {
    try {
      setError("");
      const body = {
        project_id: Number(id),
        available_material: materialsText.available_material,
        unavailable_material: materialsText.unavailable_material,
        note: materialsText.note,
      };

      const res = await fetch(api("production_upsert_material.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Save failed");
      setSuccess("Materials saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.message || "Save failed");
    }
  };

  const saveStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const body = {
        project_id: Number(id),
        prod_status: poStatus || "none",
      };
      const res = await fetch(api("production_upsert_po.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Save failed");
      setSuccess("Status saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // 1) Save PO (includes prod_status)
      {
        const body = {
          project_id: Number(id),
          po_no: po.po_no,
          po_s_date: po.po_s_date,
          po_exp_date: po.po_exp_date,
          warehouse_entry_date: po.warehouse_entry_date,
          prod_status: poStatus || "none",
        };
        const res = await fetch(api("production_upsert_po.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Saving PO failed");
      }
      // 2) Save Materials
      {
        const body = {
          project_id: Number(id),
          available_material: materialsText.available_material || "",
          unavailable_material: materialsText.unavailable_material || "",
          note: materialsText.note || "",
        };
        const res = await fetch(api("production_upsert_material.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Saving materials failed");
      }
      // 3) Save Production Location
      {
        const body = {
          prod_loc_id: Number(id),
          country: locationForm.country || "",
          state: locationForm.state || "",
          details: locationForm.details || "",
        };
        const res = await fetch(api("production_upsert_location.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data?.success) throw new Error(data?.message || "Saving production location failed");
      }
      setSuccess("All changes saved");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-page">
      <div style={actionBarStyle}>
        <h2 className="order-title" style={{ margin: 0 }}>
          <span role="img" aria-label="tools" style={{ marginRight: 8 }}>🛠️</span>
          <strong>Production Editor</strong>{" "}
          <span style={{ color: "#6b7280", fontWeight: 500 }}>
            {project?.name ? `– ${project.name} (#${id})` : `#${id}`}
          </span>
        </h2>
      </div>
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}
      {loading && (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      )}

      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Purchase Order</h3>
          <div className="form-field">
            <label className="form-label">PO No</label>
            <input
              className="form-input"
              value={po.po_no || ""}
              onChange={(e) => setPo((x) => ({ ...x, po_no: e.target.value }))}
              placeholder="PO number"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">PO Start</label>
              <input
                type="date"
                className="form-input"
                value={po.po_s_date || ""}
                onChange={(e) => setPo((x) => ({ ...x, po_s_date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">PO Expected</label>
              <input
                type="date"
                className="form-input"
                value={po.po_exp_date || ""}
                onChange={(e) => setPo((x) => ({ ...x, po_exp_date: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Warehouse Entry</label>
            <input
              type="date"
              className="form-input"
              value={po.warehouse_entry_date || ""}
              onChange={(e) => setPo((x) => ({ ...x, warehouse_entry_date: e.target.value }))}
              style={inputStyle}
            />
          </div>
          {(role === "admin" || role === "production") && (
            <button className="form-button submit-button" onClick={savePO} style={{ marginTop: 8 }}>
              Save PO
            </button>
          )}
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Materials</h3>
          <div className="form-field">
            <label className="form-label">Available Materials</label>
            <textarea
              className="form-input"
              style={{ minHeight: 100, resize: "vertical" }}
              placeholder="List available materials..."
              value={materialsText.available_material}
              onChange={(e) => setMaterialsText((m) => ({ ...m, available_material: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Unavailable Materials</label>
            <textarea
              className="form-input"
              style={{ minHeight: 100, resize: "vertical" }}
              placeholder="List unavailable materials..."
              value={materialsText.unavailable_material}
              onChange={(e) => setMaterialsText((m) => ({ ...m, unavailable_material: e.target.value }))}
            />
          </div>

          {(role === "admin" || role === "production") && (
            <button className="form-button submit-button" onClick={saveMaterialsText}>Save Materials</button>
          )}
        </div>
      </div>
      {/* Location Fields (same as ProjectEditPage) */}
      <div style={cardStyle}>
        <h3 >{/* placeholder to keep style consistent */}</h3>
        <h3 style={sectionTitleStyle}>Location</h3>
        <div className="form-field">
          <label className="form-label">Country</label>
          <select
            name="country"
            value={locationForm.country || ""}
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
            value={locationForm.state || ""}
            onChange={(e) => setLocationForm((prev) => ({ ...prev, state: e.target.value }))}
            className="form-select"
            disabled={!locationForm.country}
            style={inputStyle}
          >
            <option value="">{locationForm.country ? "Select state" : "Select country first"}</option>
            {(COUNTRIES_STATES[locationForm.country] || []).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Details</label>
          <textarea
            name="details"
            value={locationForm.details || ""}
            className="form-input"
            style={{ resize: "vertical", minHeight: 56 }}
            onChange={(e) => setLocationForm((prev) => ({ ...prev, details: e.target.value }))}
            placeholder="Location details, address, venue..."
          />
        </div>
        <div className="form-buttons">
          {(role === "admin" || role === "production") && (
            <button className="form-button submit-button" onClick={saveProductionLocation}>
              Save Location
            </button>
          )}
        </div>
      </div>
      {/* End Location Fields */}
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>Status</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: "none", label: "None" },
              { value: "inprocess", label: "In process" },
              { value: "done", label: "Done" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                style={statusPill(poStatus === opt.value)}
                onClick={() => setPoStatus(opt.value)}
                title={`Set status: ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {(role === "admin" || role === "production") && (
            <button className="form-button submit-button" onClick={saveStatus} style={{ marginLeft: "auto" }}>
              Save Status
            </button>
          )}
        </div>
      </div>
      <div className="modal-buttons" style={{ marginTop: 18, display: "flex", gap: 8, position: "sticky", bottom: 10 }}>
        {(role === "admin" || role === "production") && (
          <button
            onClick={saveAll}
            style={{
              background: "linear-gradient(90deg, #38b000 0%, #70e000 100%)",
              color: "#fff",
              padding: "12px 30px",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "1.1rem",
              boxShadow: "0 2px 8px rgba(56, 176, 0, 0.10)",
              cursor: "pointer",
              transition: "background 0.2s, transform 0.2s",
              outline: "none"
            }}
            onMouseOver={e => e.currentTarget.style.background = "linear-gradient(90deg, #70e000 0%, #38b000 100%)"}
            onMouseOut={e => e.currentTarget.style.background = "linear-gradient(90deg, #38b000 0%, #70e000 100%)"}
          >
            <svg height="20" width="20" fill="#fff" style={{ marginRight: 8, verticalAlign: "middle" }} viewBox="0 0 20 20">
              <path d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586l-3.293-3.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 00-1.414-1.414z"/>
            </svg>
            Save All
          </button>
        )}
        {/* <button onClick={() => navigate(-1)} className="form-button cancel-button">Back</button> */}
      </div>
    </div>
  );
};

export default ProductionPoEditPage;


