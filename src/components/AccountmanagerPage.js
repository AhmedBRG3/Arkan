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

const AccountmanagerPage = ({ isSidebarOpen }) => {
  // UI helpers for a modern look-and-feel
  const cardStyle = { background: "#fff", border: "1px solid #e6e6f0", borderRadius: 12, padding: 16, boxShadow: "0 4px 14px rgba(16,24,40,0.08)", marginBottom: 16 };
  const sectionTitleStyle = { margin: "0 0 12px 0", fontSize: 18, fontWeight: 700, color: "#1f2937" };
  const actionBarStyle = { position: "sticky", top: 0, zIndex: 5, background: "#fff", padding: "10px 0", marginBottom: 16, borderBottom: "1px solid #ececf1", display: "flex", alignItems: "center", justifyContent: "space-between" };
  const primaryBtnStyle = { background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer" };
  const ghostBtnStyle = { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", cursor: "pointer" };
  const PHOTO_CATEGORY_BG = { Production: "rgba(59,130,246,0.10)", Installation: "rgba(16,185,129,0.12)", "3D": "rgba(99,102,241,0.12)", Other: "#f3f4f6" };
 
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalProject, setModalProject] = useState(null);
  const [activeFileTab, setActiveFileTab] = useState("photos");
  const [showFilters, setShowFilters] = useState(false);
  const [requestsModal, setRequestsModal] = useState(false);
  const [statusRequests, setStatusRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");
  const [filters, setFilters] = useState({
    name: "",
    contact: "",
    job: "",
    status: "",
    location: "", // this now refers to country
    installFrom: "",
    installTo: "",
    // productionFrom: "",
    // productionTo: "",
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

  useEffect(() => {
    fetchProjects();
  }, []);

  const countFiles = (project, type) => {
    const list = project?.files?.[type];
    return Array.isArray(list) ? list.length : 0;
  };

  const openFiles = (project) => { setActiveFileTab("photos"); setModalProject(project); };
  const closeFiles = () => setModalProject(null);

  const fetchStatusRequests = async () => {
    try {
      setReqLoading(true);
      setReqError("");
      const res = await fetch(api("status_request_list.php?status=pending"));
      const data = await res.json();
      if (data?.success && Array.isArray(data.items)) {
        setStatusRequests(data.items);
      } else {
        setStatusRequests([]);
        setReqError(data?.message || "Failed to load requests");
      }
    } catch (e) {
      setStatusRequests([]);
      setReqError("Failed to load requests");
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    if (requestsModal) fetchStatusRequests();
  }, [requestsModal]);

  const actOnRequest = async (reqId, action) => {
    try {
      setReqError("");
      const approverName = typeof window !== "undefined" ? (JSON.parse(localStorage.getItem("loggedUser")).username || 0) : 0;
      const res = await fetch(api("status_request_update.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: reqId, approver_name: approverName, action })
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Action failed");
      setStatusRequests((prev) => prev.filter((r) => r.id !== reqId));
      fetchProjects();
    } catch (e) {
      setReqError(e.message || "Failed to update request");
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
  const renderStatusBadge = (text) => {
    const t = (text || "").toString().toLowerCase();
    let bg = "#eef2ff", color = "#3730a3", label = text || "-";
    if (!text) { bg = "#f3f4f6"; color = "#374151"; label = "-"; }
    else if (/(pending)/.test(t)) { bg = "rgba(251,191,36,0.18)"; color = "#92400e"; }
    else if (/(in\s?progress|inprocess)/.test(t)) { bg = "rgba(59,130,246,0.18)"; color = "#1e40af"; label = "In Progress"; }
    else if (/(completed|done|approved)/.test(t)) { bg = "rgba(16,185,129,0.18)"; color = "#065f46"; }
    else if (/(cancel)/.test(t)) { bg = "rgba(239,68,68,0.18)"; color = "#991b1b"; }
    return (
      <span style={{ background: bg, color, padding: "4px 10px", borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap" }}>
        {label}
      </span>
    );
  };

  // Photo category helpers (front-end only)
  const PHOTO_CATEGORIES = ["Production","Installation","3D","Other"];
  const deriveFileKey = (file, idx) => {
    if (!file) return String(idx);
    if (typeof file === "string") return file;
    return file.path || file.name || String(idx);
  };
  const loadPhotoCategoryMap = (projectId) => {
    try {
      const raw = (typeof window !== "undefined") ? localStorage.getItem(`photoCats:${projectId}`) : null;
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const savePhotoCategory = (projectId, key, category) => {
    try {
      const map = loadPhotoCategoryMap(projectId);
      map[key] = category;
      if (typeof window !== "undefined") {
        localStorage.setItem(`photoCats:${projectId}`, JSON.stringify(map));
      }
    } catch {
      // ignore
    }
  };
  const groupPhotosByCategory = (project) => {
    const items = Array.isArray(project?.files?.photos) ? project.files.photos : [];
    const map = loadPhotoCategoryMap(project?.id || project?.project_id || "");
    const groups = { Production: [], Installation: [], "3D": [], Other: [] };
    items.forEach((f, idx) => {
      const key = deriveFileKey(f, idx);
      const catServer = f?.category && PHOTO_CATEGORIES.includes(f.category) ? f.category : null;
      const catLocal = map[key] && PHOTO_CATEGORIES.includes(map[key]) ? map[key] : null;
      const cat = catServer || catLocal || "Other";
      groups[cat].push({ file: f, idx, key });
    });
    return groups;
  };
  const getPhotoCountsForProject = (project) => {
    const items = Array.isArray(project?.files?.photos) ? project.files.photos : [];
    const map = loadPhotoCategoryMap(project?.id || project?.project_id || "");
    const counts = { Production: 0, Installation: 0, "3D": 0, Other: 0 };
    items.forEach((f, idx) => {
      const key = deriveFileKey(f, idx);
      const catServer = f?.category && PHOTO_CATEGORIES.includes(f.category) ? f.category : null;
      const catLocal = map[key] && PHOTO_CATEGORIES.includes(map[key]) ? map[key] : null;
      const cat = catServer || catLocal || "Other";
      counts[cat] += 1;
    });
    return counts;
  };
  const formatPhotoCountsTooltip = (project) => {
    const c = getPhotoCountsForProject(project);
    return `Photos — P/I/3D/O: ${c.Production}/${c.Installation}/${c["3D"]}/${c.Other}`;
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
    // if (!rangesOverlap(d.production_date, d.production_end_date, filters.productionFrom, filters.productionTo)) return false;
    if (!rangesOverlap(d.event_date, d.event_end_date, filters.eventFrom, filters.eventTo)) return false;
    if (!rangesOverlap(d.remove_date, d.remove_end_date, filters.disassemblyFrom, filters.disassemblyTo)) return false;

    // no files filters
    if (filters.noFilesOnly) {
      const types = ["3d", "prova", "brief", "quotation", "photos", "invoice"];
      const anyFiles = types.some((t) => countFiles(p, t) > 0);
      if (anyFiles) return false;
    }
    if (filters.no3d && countFiles(p, "3d") > 0) return false;
    if (filters.noProva && countFiles(p, "prova") > 0) return false;
    if (filters.noBrief && countFiles(p, "brief") > 0) return false;
    if (filters.noQuotation && countFiles(p, "quotation") > 0) return false;
    if (filters.noPhotos && countFiles(p, "photos") > 0) return false;
    if (filters.noInvoice && countFiles(p, "invoice") > 0) return false;
    return true;
  });

  return (
    <div className={`order-page ${isSidebarOpen ? "shifted" : ""}`}>
      <div style={actionBarStyle}>
        <h2 className="order-title" style={{ margin: 0 }}>
          <span role="img" aria-label="clipboard" style={{ marginRight: 8 }}>📋</span>
          <strong>Orders Management - Projects</strong>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchProjects} style={ghostBtnStyle}>
            <span className="button-icon">🔄</span> Refresh
          </button>
          <button onClick={() => setShowFilters(true)} style={primaryBtnStyle}>
            Filters
          </button>
          <button onClick={() => setRequestsModal(true)} style={{ ...primaryBtnStyle, background: "linear-gradient(90deg, #10b981 0%, #34d399 100%)" }}>
            Status Requests
          </button>
        </div>
      </div>

      {error && <div className="error-message">❌ {error}</div>}

      {showFilters && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setShowFilters(false)}>
          <div
            className="modal-content production-filters-modal"
            style={{ maxWidth: 1000, margin: "2rem auto", borderRadius: 12, border: "1px solid #e6e6f0", boxShadow: "0 4px 14px rgba(16,24,40,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderBottom: "1px solid #ececf1", paddingBottom: 8 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Filters</h3>
              <button className="form-button cancel-button" onClick={() => setShowFilters(false)}>Close</button>
            </div>
            <div style={{ display: "flex", flexDirection: "row" }}>
              <div style={{ flex: 2, marginRight: 24 }}>
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
                  {/* <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Production From</label>
                    <input type="date" className="form-input" name="productionFrom" value={filters.productionFrom} onChange={handleFilterChange} />
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <label className="form-label">Production To</label>
                    <input type="date" className="form-input" name="productionTo" value={filters.productionTo} onChange={handleFilterChange} />
                  </div> */}
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
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                </div>
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
                        // productionFrom: "",
                        // productionTo: "",
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

      {loading ? (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={cardStyle}>
          <p className="no-orders" style={{ margin: 0 }}>No projects found.</p>
        </div>
      ) : (
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>Projects</h3>
          <div style={{ color: "#6b7280", marginBottom: 8 }}>{filteredProjects.length} results</div>
          <div style={{ overflowX: "auto" }}>
            <table className="order-table" style={{ minWidth: 900, whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th>Created At</th>
                  <th>ID</th>
                  <th>Company Name</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Job No</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Install</th>
                  {/* <th>Production</th> */}
                  <th>Event</th>
                  <th>Off</th>
                  <th>Notes</th>
                  <th>3D</th>
                  <th>Prova</th>
                  <th>Brief</th>
                  <th>Quotation</th>
                  <th>Photos</th>
                  <th>Invoice</th>  
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
                    <td className="table-cell" style={{ maxWidth: 220, overflow: "auto", whiteSpace: "nowrap" }}>
                      <div style={{ maxWidth: 220, overflowX: "auto", whiteSpace: "nowrap" }}>
                        {getLocationText(p) || "-"}
                      </div>
                    </td>
                    <td className="table-cell">{renderStatusBadge(p.status)}</td>
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
                    {/* <td className="table-cell">
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
                    </td> */}
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
                    <td className="table-cell">{countFiles(p, "3d")}</td>
                    <td className="table-cell">{countFiles(p, "prova")}</td>
                    <td className="table-cell">{countFiles(p, "brief")}</td>
                    <td className="table-cell">{countFiles(p, "quotation")}</td>
                    <td
                      className="table-cell"
                      title={formatPhotoCountsTooltip(p)}
                    >
                      {countFiles(p, "photos")}
                    </td>
                    <td className="table-cell">{countFiles(p, "invoice")}</td>
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
                        <a
                          href={`/arkann/project/${p.id}/edit`}
                          className="icon-button"
                          style={{ padding: 4, fontSize: 15 }}
                          title="Edit Project"
                          aria-label="Edit Project"
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
        </div>
      )}

      {modalProject && (
        <div className="modal" role="dialog" aria-modal="true" onClick={closeFiles}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {modalProject.showNotesOnly ? (
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderBottom: "1px solid #ececf1", paddingBottom: 8 }}>
                  <h3 className="modal-title" style={{ margin: 0 }}>Files - {modalProject.name}</h3>
                  <button className="form-button cancel-button" onClick={closeFiles} aria-label="Close">✕</button>
                </div>
                <div style={{ maxHeight: 520, overflow: "auto", paddingRight: 6 }}>
                  {(() => {
                    const tabs = ["photos","3d","prova","brief","quotation","invoice"];
                    const counts = {};
                    tabs.forEach((t) => {
                      counts[t] = Array.isArray(modalProject.files?.[t]) ? modalProject.files[t].length : 0;
                    });
                    return (
                      <>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                          {tabs.map((t) => {
                            const active = activeFileTab === t;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setActiveFileTab(t)}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: 999,
                                  border: `1px solid ${active ? "#2563eb" : "#e5e7eb"}`,
                                  background: active ? "rgba(37,99,235,0.08)" : "#fff",
                                  color: active ? "#1e40af" : "#374151",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {t.toUpperCase()} {counts[t] ? `(${counts[t]})` : ""}
                              </button>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            marginBottom: 12,
                            background: "#fff",
                            border: "1px solid #e6e6f0",
                            borderRadius: 10,
                            padding: 12,
                            boxShadow: "0 2px 10px rgba(16,24,40,0.05)",
                          }}
                        >
                          <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: 6, color: "#1f2937" }}>
                            {activeFileTab}
                          </div>
                          {activeFileTab === "photos" ? (
                            (() => {
                              const groups = groupPhotosByCategory(modalProject);
                              return (
                                <div style={{ marginTop: 6 }}>
                                  {PHOTO_CATEGORIES.map((cat) => {
                                    const list = groups[cat] || [];
                                    if (list.length === 0) return null;
                                    return (
                                      <div key={cat} style={{ marginBottom: 10, background: PHOTO_CATEGORY_BG[cat] || "#f3f4f6", borderRadius: 10, padding: 8 }}>
                                        <div style={{ fontWeight: 700, marginBottom: 4, color: "#111827" }}>{cat}</div>
                                        <ol style={{ margin: "6px 0 0 16px" }}>
                                          {list.map(({ file: f, idx }) => {
                                            const href = f.path ? `${API_BASE}/${f.path}` : `${API_BASE}/${f}`;
                                            const name = f.name || f.path || f;
                                            return (
                                              <li key={`${cat}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px dashed #eee" }}>
                                                <span aria-hidden="true" style={{ opacity: 0.8 }}>📎</span>
                                                <a href={href} target="_blank" rel="noreferrer" style={{ flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                  {name}
                                                </a>
                                              </li>
                                            );
                                          })}
                                        </ol>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          ) : (
                            (() => {
                              const items = Array.isArray(modalProject.files?.[activeFileTab]) ? modalProject.files[activeFileTab] : [];
                              if (items.length === 0) {
                                return <div style={{ color: "#999" }}>No files</div>;
                              }
                              return (
                                <ol style={{ margin: "6px 0 0 16px" }}>
                                  {items.map((f, idx) => {
                                    const href = f.path ? `${API_BASE}/${f.path}` : `${API_BASE}/${f}`;
                                    const name = f.name || f.path || f;
                                    return (
                                      <li key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px dashed #eee" }}>
                                        <span aria-hidden="true" style={{ opacity: 0.8 }}>📎</span>
                                        <a href={href} target="_blank" rel="noreferrer" style={{ flex: "1 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {name}
                                        </a>
                                      </li>
                                    );
                                  })}
                                </ol>
                              );
                            })()
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="modal-buttons"><button onClick={closeFiles} className="form-button cancel-button">Close</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {requestsModal && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setRequestsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderBottom: "1px solid #ececf1", paddingBottom: 8 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Status Requests (pending)</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="form-button refresh-button" onClick={fetchStatusRequests}>Refresh</button>
                <button className="form-button cancel-button" onClick={() => setRequestsModal(false)}>Close</button>
              </div>
            </div>
            {reqError && <div className="error-message">❌ {reqError}</div>}
            {reqLoading ? (
              <div className="loading"><span className="spinner"></span> Loading...</div>
            ) : statusRequests.length === 0 ? (
              <div style={{ color: "#6b7280" }}>No pending requests.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {statusRequests.map((r) => (
                  <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div><strong>Project:</strong> {r.project_name} (#{r.project_id})</div>
                      <div><strong>Company:</strong> {r.company_name || "-"}</div>
                      <div><strong>Requested:</strong> {r.created_at}</div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <strong>From:</strong> {r.from_status || "-"} → <strong>To:</strong> {r.to_status}
                    </div>
                    {r.reason ? <div style={{ marginTop: 4, color: "#374151" }}><strong>Reason:</strong> {r.reason}</div> : null}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="form-button submit-button" onClick={() => actOnRequest(r.id, "approve")}>Approve</button>
                      <button className="form-button cancel-button" onClick={() => actOnRequest(r.id, "deny")}>Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountmanagerPage;

