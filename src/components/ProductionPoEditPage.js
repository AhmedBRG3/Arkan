// components/ProductionPoEditPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/OrderListPage.css";

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
      const body = { project_id: Number(id), po_no: po.po_no, po_s_date: po.po_s_date, po_exp_date: po.po_exp_date, warehouse_entry_date: po.warehouse_entry_date };
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

  // const deleteMaterial = async (mid) => {
  //   try {
  //     setError("");
  //     const res = await fetch(api("production_delete_material.php"), {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       credentials: "include",
  //       body: JSON.stringify({ id: mid }),
  //     });
  //     const data = await res.json();
  //     if (!data?.success) throw new Error(data?.message || "Delete failed");
  //     setMaterials((list) => list.filter((x) => x.id !== mid));
  //   } catch (e) {
  //     setError(e.message || "Delete failed");
  //   }
  // };

  return (
    <div className="order-page">
      <h2 className="order-title">
        Production Editor{" "}
        {project?.name
          ? `- ${project.name} (#${id})`
          : `#${id}`}
      </h2>
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}
      {loading && (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      )}

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "10px 0" }}>Purchase Order</h4>
          <div className="form-field">
            <label className="form-label">PO No</label>
            <input
              className="form-input"
              value={po.po_no || ""}
              onChange={(e) => setPo((x) => ({ ...x, po_no: e.target.value }))}
              placeholder="PO number"
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">PO Start</label>
              <input
                type="date"
                className="form-input"
                value={po.po_s_date || ""}
                onChange={(e) => setPo((x) => ({ ...x, po_s_date: e.target.value }))}
              />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="form-label">PO Expected</label>
              <input
                type="date"
                className="form-input"
                value={po.po_exp_date || ""}
                onChange={(e) => setPo((x) => ({ ...x, po_exp_date: e.target.value }))}
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
            />
          </div>
          {(role === "admin" || role === "production") && (
            <button className="form-button submit-button" onClick={savePO} style={{ marginTop: 8 }}>
              Save PO
            </button>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "10px 0" }}>Materials</h4>
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
          {/* <div className="form-field">
            <label className="form-label">Note</label>
            <textarea
              className="form-input"
              style={{ minHeight: 80, resize: "vertical" }}
              placeholder="Notes"
              value={materialsText.note}
              onChange={(e) => setMaterialsText((m) => ({ ...m, note: e.target.value }))}
            />
          </div> */}
          {(role === "admin" || role === "production") && (
            <button className="form-button submit-button" onClick={saveMaterialsText}>Save Materials</button>
          )}
        </div>
      </div>
      <div className="modal-buttons" style={{ marginTop: 18 }}>
        <button onClick={() => navigate(-1)} className="form-button cancel-button">Back</button>
      </div>
    </div>
  );
};

export default ProductionPoEditPage;


