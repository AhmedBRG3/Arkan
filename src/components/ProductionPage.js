// components/ProductionPage.jsx
import React, { useEffect, useState } from "react";
import "../styles/OrderListPage.css";

const API_BASE = "https://arkanaltafawuq.com/arkan-system";
const api = (p) => `${API_BASE}/${String(p).replace(/^\/+/, "")}`;

// Static list of countries for location filter
const COUNTRY_OPTIONS = [
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Jordan",
  "Egypt",
  "Turkey",
  "Lebanon",
  "Morocco",
  "Tunisia",
  "Algeria",
  "Iraq",
  "Libya",
  "Sudan",
  "Other",
];

const ProductionPage = ({ isSidebarOpen }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalProject, setModalProject] = useState(null);
  const [prodSummary, setProdSummary] = useState({}); // project_id -> summary
  const [showFilters, setShowFilters] = useState(false);
  const [compactProd, setCompactProd] = useState(true); // merge PO+Materials into one column
  const [compactDates, setCompactDates] = useState(true); // merge Install/Production/Event/Off into one column
  const [filters, setFilters] = useState({
    name: "",
    contact: "",
    job: "",
    status: "",
    location: "", // this now refers to country
    installFrom: "",
    installTo: "",
    productionFrom: "",
    productionTo: "",
    eventFrom: "",
    eventTo: "",
    disassemblyFrom: "",
    disassemblyTo: "",
    noFilesOnly: false,
    no3d: false,
    noProva: false,
    noBrief: false,
    noQuotation: false,
    noPhotos: false,
    noInvoice: false,
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(api("projects_list.php"));
      const data = await res.json();
      if (data?.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
      } else {
        setProjects([]);
        setError(data?.message || "Failed to load projects");
      }
    } catch (e) {
      console.error(e);
      setProjects([]);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  // Fetch production summaries and map by project_id
  const fetchProductionSummary = async () => {
    try {
      const res = await fetch(api("production_get_summary.php"), { credentials: "include" });
      const data = await res.json();
      if (data?.success && Array.isArray(data.items)) {
        const map = {};
        data.items.forEach((it) => { map[it.project_id] = it; });
        setProdSummary(map);
      } else {
        setProdSummary({});
      }
    } catch (e) {
      console.error(e);
      setProdSummary({});
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchProjects(), fetchProductionSummary()]);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countFiles = (project, type) => {
    const list = project?.files?.[type];
    return Array.isArray(list) ? list.length : 0;
  };

  const openFiles = (project) => setModalProject(project);
  const closeFiles = () => setModalProject(null);
  const role = typeof window !== "undefined" ? (localStorage.getItem("role") || "") : "";

  // no inline editor anymore; moved to standalone page

  // Open Materials modal and fetch full materials text
  const openMaterials = async (project) => {
    setModalProject({
      ...project,
      showMaterialsOnly: true,
      materialsLoading: true,
      materialsText: { available: "", unavailable: "" },
    });
    try {
      const res = await fetch(api(`production_get_detail.php?project_id=${project.id}`), { credentials: "include" });
      const data = await res.json();
      const mt = data?.materials_text || null;
      const available = mt?.available_material || "";
      const unavailable = mt?.unavailable_material || "";
      setModalProject((prev) => {
        if (!prev || prev.id !== project.id || !prev.showMaterialsOnly) return prev;
        return { ...prev, materialsLoading: false, materialsText: { available, unavailable } };
      });
    } catch (e) {
      setModalProject((prev) => {
        if (!prev || prev.id !== project.id || !prev.showMaterialsOnly) return prev;
        return { ...prev, materialsLoading: false, materialsText: { available: "", unavailable: "" } };
      });
    }
  };

  const handleFilterChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFilters((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const parseDate = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const getLocationText = (p) => {
    const loc = p?.location;
    if (!loc) return "";
    if (typeof loc === "string") return loc;
    if (typeof loc === "object") {
      const parts = [loc.country, loc.state, loc.details].filter(Boolean);
      return parts.join(" - ");
    }
    return "";
  };

  const getCountryValueFromProject = (p) => {
    const loc = p?.location;
    if (!loc) return "";
    if (typeof loc === "object" && loc.country) return loc.country;
    if (typeof loc === "string") return loc;
    return "";
  };

  const rangesOverlap = (startA, endA, startB, endB) => {
    if (!startB && !endB) return true; // no filter applied
    const aStart = startA ? new Date(startA) : null;
    const aEnd = endA ? new Date(endA) : aStart;
    const bStart = parseDate(startB);
    const bEnd = parseDate(endB) || bStart;
    if (!aStart && !aEnd) return false;
    // Overlap if A_start <= B_end && A_end >= B_start
    const aS = aStart || aEnd;
    const aE = aEnd || aStart;
    return aS <= bEnd && aE >= bStart;
  };

  const filteredProjects = projects.filter((p) => {
    // text filters
    if (filters.name && !(p.name || "").toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.contact && !(p.Response_name || "").toLowerCase().includes(filters.contact.toLowerCase())) return false;
    if (filters.job && !(p.job_no || "").toLowerCase().includes(filters.job.toLowerCase())) return false;
    if (filters.status && !(p.status || "").toLowerCase().includes(filters.status.toLowerCase())) return false;
    if (filters.location) {
      // If location filter (country) is applied, match strictly on project location's country field or string value
      const country = getCountryValueFromProject(p).toLowerCase();
      if (country !== filters.location.toLowerCase()) return false;
    }

    const d = p?.dates || {};
    // date range filters per column
    if (!rangesOverlap(d.install_date, d.install_end_date, filters.installFrom, filters.installTo)) return false;
    if (!rangesOverlap(d.production_date, d.production_end_date, filters.productionFrom, filters.productionTo)) return false;
    if (!rangesOverlap(d.event_date, d.event_end_date, filters.eventFrom, filters.eventTo)) return false;
    if (!rangesOverlap(d.remove_date, d.remove_end_date, filters.disassemblyFrom, filters.disassemblyTo)) return false;

    // no files filters
    // if (filters.noFilesOnly) {
    //   const types = ["3d", "prova", "brief", "quotation", "photos", "invoice"];
    //   const anyFiles = types.some((t) => countFiles(p, t) > 0);
    //   if (anyFiles) return false;
    // }
    // if (filters.no3d && countFiles(p, "3d") > 0) return false;
    // if (filters.noProva && countFiles(p, "prova") > 0) return false;
    // if (filters.noBrief && countFiles(p, "brief") > 0) return false;
    // if (filters.noQuotation && countFiles(p, "quotation") > 0) return false;
    // if (filters.noPhotos && countFiles(p, "photos") > 0) return false;
    // if (filters.noInvoice && countFiles(p, "invoice") > 0) return false;
    return true;
  });

  return (
    <div className={`order-page ${isSidebarOpen ? "shifted" : ""}`}>
      <h2 className="order-title">Operation - Projects</h2>

      {error && <div className="error-message">❌ {error}</div>}

      <div className="status-buttons">
        <button onClick={fetchAll} className="form-button refresh-button">
          <span className="button-icon">🔄</span> Refresh
        </button>
        <button onClick={() => setShowFilters(true)} className="form-button submit-button">
          Filters
        </button>
      </div>
      {showFilters && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setShowFilters(false)}>
          <div
            className="modal-content production-filters-modal"
            style={{ maxWidth: 1000, margin: "2rem auto", borderRadius: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Filters</h3>
              <button className="form-button cancel-button" onClick={() => setShowFilters(false)}>Close</button>
            </div>
            <div style={{ display: "flex", flexDirection: "row" }}>
              <div style={{ flex: 2, marginRight: 24 }}>
                <h4 style={{ marginBottom: 12 }}>Project Filters</h4>
                <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                  <div className="form-field" style={{ flex: 1, minWidth: 130 }}>
                    <label className="form-label">Name</label>
                    <input className="form-input" name="name" value={filters.name} onChange={handleFilterChange} placeholder="Search name" />
                  </div>
                  <div className="form-field" style={{ flex: 1, minWidth: 130 }}>
                    <label className="form-label">Contact</label>
                    <input className="form-input" name="contact" value={filters.contact} onChange={handleFilterChange} placeholder="Search contact" />
                  </div>
                  <div className="form-field" style={{ flex: 1, minWidth: 110 }}>
                    <label className="form-label">Job No</label>
                    <input className="form-input" name="job" value={filters.job} onChange={handleFilterChange} placeholder="Search job no" />
                  </div>
                  <div className="form-field" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">Status</label>
                    <input className="form-input" name="status" value={filters.status} onChange={handleFilterChange} placeholder="Search status" />
                  </div>
                  <div className="form-field" style={{ flex: 1, minWidth: 120 }}>
                    <label className="form-label">Location</label>
                    <select
                      className="form-input"
                      name="location"
                      value={filters.location}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Countries</option>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option value={country} key={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Install From</label>
                    <input type="date" className="form-input" name="installFrom" value={filters.installFrom} onChange={handleFilterChange} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Install To</label>
                    <input type="date" className="form-input" name="installTo" value={filters.installTo} onChange={handleFilterChange} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Production From</label>
                    <input type="date" className="form-input" name="productionFrom" value={filters.productionFrom} onChange={handleFilterChange} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Production To</label>
                    <input type="date" className="form-input" name="productionTo" value={filters.productionTo} onChange={handleFilterChange} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Event From</label>
                    <input type="date" className="form-input" name="eventFrom" value={filters.eventFrom} onChange={handleFilterChange} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Event To</label>
                    <input type="date" className="form-input" name="eventTo" value={filters.eventTo} onChange={handleFilterChange} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Disassembly From</label>
                    <input type="date" className="form-input" name="disassemblyFrom" value={filters.disassemblyFrom} onChange={handleFilterChange} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Disassembly To</label>
                    <input type="date" className="form-input" name="disassemblyTo" value={filters.disassemblyTo} onChange={handleFilterChange} />
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 240, borderLeft: "1px solid #eee", paddingLeft: 24 }}>
                <h4 style={{ marginBottom: 10 }}>Files Filters</h4>
                {/* <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label className="form-label" style={{ fontWeight: 500 }}>
                    <input type="checkbox" name="noFilesOnly" checked={filters.noFilesOnly} onChange={handleFilterChange} style={{ marginRight: 7 }} />
                    Only no files uploaded
                  </label>
                  <label className="form-label">
                    <input type="checkbox" name="no3d" checked={filters.no3d} onChange={handleFilterChange} style={{ marginRight: 7 }} />
                    No 3D
                  </label>
                  <label className="form-label">
                    <input type="checkbox" name="noProva" checked={filters.noProva} onChange={handleFilterChange} style={{ marginRight: 7 }} />
                    No Prova
                  </label>
                  <label className="form-label">
                    <input type="checkbox" name="noBrief" checked={filters.noBrief} onChange={handleFilterChange} style={{ marginRight: 7 }} />
                    No Brief
                  </label>
                  <label className="form-label">
                    <input type="checkbox" name="noQuotation" checked={filters.noQuotation} onChange={handleFilterChange} style={{ marginRight: 7 }} />
                    No Quotation
                  </label>
                  <label className="form-label">
                    <input type="checkbox" name="noPhotos" checked={filters.noPhotos} onChange={handleFilterChange} style={{ marginRight: 7 }} />
                    No Photos
                  </label>
                  <label className="form-label">
                    <input type="checkbox" name="noInvoice" checked={filters.noInvoice} onChange={handleFilterChange} style={{ marginRight: 7 }} />
                    No Invoice
                  </label>
                </div> */}
                <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                  <button
                    className="form-button reset-button"
                    style={{ width: "100%", padding: "0.5em 1em" }}
                    onClick={() =>
                      setFilters({
                        name: "",
                        contact: "",
                        job: "",
                        status: "",
                        location: "",
                        installFrom: "",
                        installTo: "",
                        productionFrom: "",
                        productionTo: "",
                        eventFrom: "",
                        eventTo: "",
                        disassemblyFrom: "",
                        disassemblyTo: "",
                        noFilesOnly: false,
                        no3d: false,
                        noProva: false,
                        noBrief: false,
                        noQuotation: false,
                        noPhotos: false,
                        noInvoice: false,
                      })
                    }
                  >
                    Clear Filters
                  </button>
                  <button
                    className="form-button submit-button"
                    style={{ width: "100%", padding: "0.5em 1em" }}
                    onClick={() => setShowFilters(false)}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* production inline editor removed; see ProductionPoEditPage */}

      {loading ? (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      ) : filteredProjects.length === 0 ? (
        <p className="no-orders">No projects found.</p>
      ) : (
        <div >
          <table className="order-table" style={{overflowX: "auto", whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Created At</th>
                <th>ID</th>
                <th>Company Name</th>
                <th>Project Name</th>
                <th>Contact</th>
                <th>Job No</th>
                <th>Location</th>
                <th>Status</th>
                {compactProd ? (
                  <>
                    <th
                      style={{ cursor: "pointer", userSelect: "none", background: "rgba(25,118,210,0.10)", color: "#0d47a1", padding: "4px 6px", borderRadius: 8 }}
                      onClick={() => setCompactProd(false)}
                      title="Expand columns"
                    >
                      PO & Materials <span style={{ marginLeft: 6 }}>▾</span>
                    </th>
                    <th>Warehouse Entry</th>
                  </>
                ) : (
                  <>
                    <th
                      style={{ cursor: "pointer", userSelect: "none", background: "rgba(25,118,210,0.10)", color: "#0d47a1", padding: "4px 6px", borderRadius: 8 }}
                      onClick={() => setCompactProd(true)}
                      title="Compact columns"
                    >
                      PO No <span style={{ marginLeft: 6 }}>▸</span>
                    </th>
                    <th style={{ cursor: "pointer", userSelect: "none", background: "rgba(25,118,210,0.10)", 
                      color: "#0d47a1", padding: "4px 6px", borderRadius: 8 }}>PO Dates</th>
                    <th style={{ cursor: "pointer", userSelect: "none", background: "rgba(25,118,210,0.10)", 
                      color: "#0d47a1", padding: "4px 6px", borderRadius: 8 }}>Warehouse Entry</th>
                    
                    <th style={{ cursor: "pointer", userSelect: "none", background: "rgba(25,118,210,0.10)", 
                      color: "#0d47a1", padding: "4px 6px", borderRadius: 8 }}>Available Mat</th>
                    <th                      style={{ cursor: "pointer", userSelect: "none", background: "rgba(25,118,210,0.10)", color: "#0d47a1", padding: "4px 6px", borderRadius: 8 }}
                    >Unavailable Mat</th>
                  </>
                )}
                {compactDates ? (
                  <th
                    style={{ cursor: "pointer", userSelect: "none", background: "rgba(111,66,193,0.10)", color: "#4a148c", padding: "4px 6px", borderRadius: 8 }}
                    onClick={() => setCompactDates(false)}
                    title="Expand date columns"
                  >
                    Dates <span style={{ marginLeft: 6 }}>▾</span>
                  </th>
                ) : (
                  <>
                    <th
                    style={{ cursor: "pointer", userSelect: "none", background: "rgba(111,66,193,0.10)", color: "#4a148c", padding: "4px 6px", borderRadius: 8 }}
                    onClick={() => setCompactDates(true)}
                      title="Compact date columns"
                    >
                      Install <span style={{ marginLeft: 6 }}>▸</span>
                    </th>
                    <th style={{ cursor: "pointer", userSelect: "none", background: "rgba(111,66,193,0.10)", 
                      color: "#4a148c", padding: "4px 6px", borderRadius: 8 }}>Production</th>
                    <th style={{ cursor: "pointer", userSelect: "none", background: "rgba(111,66,193,0.10)",
                       color: "#4a148c", padding: "4px 6px", borderRadius: 8 }} >Event</th>
                    <th style={{ cursor: "pointer", userSelect: "none", background: "rgba(111,66,193,0.10)",
                       color: "#4a148c", padding: "4px 6px", borderRadius: 8 }} >Off</th>
                    
                  </>
                )}
                <th>Notes</th>
                {/* <th>3D</th>
                <th>Prova</th>
                <th>Brief</th>
                <th>Quotation</th>
                <th>Photos</th>
                <th>Invoice</th> */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr key={p.id}>
                  <td className="table-cell">{p.created_at || "-"}</td>
                  <td className="table-cell">{p.id}</td>
                  <td className="table-cell">{p.company_name || "-"}</td>
                  <td className="table-cell">{p.name}</td>
                  <td className="table-cell">{p.Response_name || "-"}</td>
                  <td className="table-cell">{p.job_no || "-"}</td>
                  <td className="table-cell" style={{ maxWidth: 180, overflow: "auto", whiteSpace: "nowrap" }}>
                    <div style={{ maxWidth: 180, overflowX: "auto", whiteSpace: "nowrap" }}>
                      {getLocationText(p) || "-"}
                    </div>
                  </td>
                  <td className="table-cell">{p.status || "-"}</td>
                  {(() => {
                    const s = prodSummary[p.id] || {};
                    const po = s?.po || {};
                    const names = Array.isArray(s?.materials_preview) ? s.materials_preview.map((m) => m.material).filter(Boolean) : [];
                    const firstTwo = names.slice(0, 2);
                    const titleText = names.join(", ");
                    const mt = s?.materials_text_preview || null;
                    const availableText = mt ? (mt.available_preview || "-") : (firstTwo.length ? firstTwo.join(", ") : "-");
                    const unavailableText = mt ? (mt.unavailable_preview || "-") : "-";
                    if (compactProd) {
                      const summaryParts = [
                        po?.po_no ? `PO: ${po.po_no}` : "PO: -",
                        po?.po_s_date ? (po?.po_exp_date ? `${po.po_s_date}→${po.po_exp_date}` : po.po_s_date) : "-",
                        availableText && availableText !== "-" ? `Av: ${availableText}` : "Av: -",
                        unavailableText && unavailableText !== "-" ? `Un: ${unavailableText}` : "Un: -",
                      ];
                      const summaryText = summaryParts.join(" | ");
                      return (
                        <>
                          <td
                            className="table-cell"
                            title={summaryText}
                            style={{
                              width: 360,
                              maxWidth: 360,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                              textDecoration: "underline dotted",
                              background: "rgba(25,118,210,0.10)",
                              color: "#0d47a1",
                              padding: "6px 8px",
                              borderRadius: 8,
                            }}
                            onClick={() => setCompactProd(false)}
                          >
                            {summaryText}
                          </td>
                          <td className="table-cell">{po?.warehouse_entry_date || "-"}</td>
                        </>
                      );
                    }
                    // Expanded columns view
                    return (
                      <>
                        <td className="table-cell">{po?.po_no || "-"}</td>
                        <td className="table-cell">
                          {po?.po_s_date ? (
                            <div>
                              <div>{po?.po_s_date}</div>
                              {po?.po_exp_date && (
                                <>
                                  <div style={{ fontWeight: "bold", textAlign: "center" }}>to</div>
                                  <div>{po?.po_exp_date}</div>
                                </>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="table-cell">{po?.warehouse_entry_date || "-"}</td>
                        <td
                          className="table-cell"
                          title={titleText}
                          style={{
                            width: 200,
                            maxWidth: 200,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: availableText && availableText !== "-" ? "pointer" : "default",
                            textDecoration: availableText && availableText !== "-" ? "underline dotted" : "none",
                          }}
                          onClick={() => {
                            if (availableText && availableText !== "-") openMaterials(p);
                          }}
                        >
                          {availableText}
                        </td>
                        <td
                          className="table-cell"
                          title={unavailableText}
                          style={{
                            width: 200,
                            maxWidth: 200,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: unavailableText && unavailableText !== "-" ? "pointer" : "default",
                            textDecoration: unavailableText && unavailableText !== "-" ? "underline dotted" : "none",
                          }}
                          onClick={() => {
                            if (unavailableText && unavailableText !== "-") openMaterials(p);
                          }}
                        >
                          {unavailableText}
                        </td>
                      </>
                    );
                  })()}
                  {compactDates ? (
                    (() => {
                      const d = p?.dates || {};
                      const fmt = (s, e) => (s ? (e ? `${s}→${e}` : s) : "-");
                      const parts = [
                        `I: ${fmt(d.install_date, d.install_end_date)}`,
                        `P: ${fmt(d.production_date, d.production_end_date)}`,
                        `E: ${fmt(d.event_date, d.event_end_date)}`,
                        `Off: ${fmt(d.remove_date, d.remove_end_date)}`,
                      ];
                      const text = parts.join(" | ");
                      return (
                        <td
                          className="table-cell"
                          title={text}
                          style={{
                            width: 420,
                            maxWidth: 420,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: "pointer",
                            textDecoration: "underline dotted",
                            background: "rgba(111,66,193,0.10)",
                            color: "#4a148c",
                            padding: "6px 8px",
                            borderRadius: 8,
                          }}
                          onClick={() => setCompactDates(false)}
                        >
                          {text}
                        </td>
                      );
                    })()
                  ) : (
                    <>
                      <td className="table-cell">
                        {p?.dates?.install_date ? (
                          <div>
                            <div>{p?.dates?.install_date}</div>
                            {p?.dates?.install_end_date && (
                              <>
                                <div style={{ fontWeight: "bold", textAlign: "center" }}>to</div>
                                <div>{p?.dates?.install_end_date}</div>
                              </>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="table-cell">
                        {p?.dates?.production_date ? (
                          <div>
                            <div>{p?.dates?.production_date}</div>
                            {p?.dates?.production_end_date && (
                              <>
                                <div style={{ fontWeight: "bold", textAlign: "center" }}>to</div>
                                <div>{p?.dates?.production_end_date}</div>
                              </>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="table-cell">
                        {p?.dates?.event_date ? (
                          <div>
                            <div>{p?.dates?.event_date}</div>
                            {p?.dates?.event_end_date && (
                              <>
                                <div style={{ fontWeight: "bold", textAlign: "center" }}>to</div>
                                <div>{p?.dates?.event_end_date}</div>
                              </>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="table-cell">
                        {p?.dates?.remove_date ? (
                          <div>
                            <div>{p?.dates?.remove_date}</div>
                            {p?.dates?.remove_end_date && (
                              <>
                                <div style={{ fontWeight: "bold", textAlign: "center" }}>to</div>
                                <div>{p?.dates?.remove_end_date}</div>
                              </>
                            )}
                          </div> 
                        ) : (
                          "-"
                        )}
                      </td>
                    </>
                  )}
                  <td
                    className="table-cell"
                    style={{ cursor: p.notes ? "pointer" : "default", textDecoration: p.notes ? "underline dotted" : "none" }}
                    onClick={() => {
                      if (p.notes) {
                        setModalProject({
                          ...p,
                          showNotesOnly: true
                        });
                      }
                    }}
                  >
                    {p.notes ? (
                      <span title="Click to view full notes">{(p.notes.length > 30 ? p.notes.slice(0, 30) + "…" : p.notes)}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  {/* <td className="table-cell">{countFiles(p, "3d")}</td>
                  <td className="table-cell">{countFiles(p, "prova")}</td>
                  <td className="table-cell">{countFiles(p, "brief")}</td>
                  <td className="table-cell">{countFiles(p, "quotation")}</td>
                  <td className="table-cell">{countFiles(p, "photos")}</td>
                  <td className="table-cell">{countFiles(p, "invoice")}</td> */}
                  <td className="table-cell">
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        className="icon-button"
                        style={{ cursor: "pointer", padding: 4, fontSize: 15 }}
                        title="View Files"
                        role="button"
                        tabIndex={0}
                        aria-label="View Files"
                        onClick={() => openFiles(p)}
                        onKeyPress={e => (e.key === 'Enter' || e.key === ' ') && openFiles(p)}
                      >
                        📂
                      </span>
                      {(role === "admin" || role === "production") && (
                        <a
                          href={`/arkann/production_po_edit/${p.id}`}
                          className="icon-button"
                          style={{ padding: 4, fontSize: 15 }}
                          title="Edit Production"
                          aria-label="Edit Production"
                        >
                          🛠️
                        </a>
                      )}
                      <a
                        href={`/arkann/operationedit/${p.id}`}
                        className="icon-button"
                        style={{ padding: 4, fontSize: 15 }}
                        title="Edit Operation"
                        aria-label="Edit Operation"
                      >
                        ✏️
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalProject && (
          <div className="modal" role="dialog" aria-modal="true" onClick={closeFiles}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {modalProject.showMaterialsOnly ? (
                  <>
                    <h3 className="modal-title">Materials - {modalProject.name}</h3>
                    {modalProject.materialsLoading ? (
                      <div className="loading">
                        <span className="spinner"></span> Loading...
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid #e1e6eb",
                            borderRadius: 10,
                            padding: "18px 20px",
                            margin: "18px 0",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                            color: "#333",
                            whiteSpace: "pre-wrap",
                            fontSize: 15,
                          }}
                        >
                          <strong style={{ display: "block", marginBottom: 6 }}>Available</strong>
                          {modalProject.materialsText?.available || "-"}
                        </div>
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid #e1e6eb",
                            borderRadius: 10,
                            padding: "18px 20px",
                            margin: "18px 0",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                            color: "#333",
                            whiteSpace: "pre-wrap",
                            fontSize: 15,
                          }}
                        >
                          <strong style={{ display: "block", marginBottom: 6 }}>Unavailable</strong>
                          {modalProject.materialsText?.unavailable || "-"}
                        </div>
                      </>
                    )}
                    <div className="modal-buttons">
                      <button onClick={closeFiles} className="form-button cancel-button">
                        Close
                      </button>
                    </div>
                  </>
                ) : modalProject.showNotesOnly ? (
                  <>
                    <h3 className="modal-title">Notes - {modalProject.name}</h3>
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e1e6eb",
                        borderRadius: 10,
                        padding: "18px 20px",
                        margin: "18px 0",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                        color: "#333",
                        whiteSpace: "pre-wrap",
                        fontSize: 15,
                      }}
                    >
                      {modalProject.notes || "-"}
                    </div>
                    <div className="modal-buttons">
                      <button onClick={closeFiles} className="form-button cancel-button">
                        Close
                      </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="modal-title">Files - {modalProject.name}</h3>
                <div style={{ maxHeight: 400, overflow: "auto" }}>
                  {["3d", "prova", "brief", "quotation", "photos", "invoice"].map((type) => {
                    const items = Array.isArray(modalProject.files?.[type]) ? modalProject.files[type] : [];
                    return (
                      <div key={type} style={{ marginBottom: 12 }}>
                        <strong style={{ textTransform: "uppercase" }}>{type}</strong>
                        {items.length === 0 ? (
                          <div style={{ color: "#999" }}>No files</div>
                        ) : (
                          <ol style={{ margin: "6px 0 0 16px" }}>
                            {items.map((f, idx) => {
                              const href = f.path ? `${API_BASE}/${f.path}` : `${API_BASE}/${f}`;
                              const name = f.name || f.path || f;
                              return (
                                <li key={idx}>
                                  <a href={href} target="_blank" rel="noreferrer">
                                    {name}
                                  </a>
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="modal-buttons">
                  <button onClick={closeFiles} className="form-button cancel-button">
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionPage;

