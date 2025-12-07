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
  const [activeFileTab, setActiveFileTab] = useState("photos");
  const [filters, setFilters] = useState({
    name: "",
    contact: "",
    job: "",
    status: "",
    productionStatus: "",
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
  const [statusMap, setStatusMap] = useState({});
  const [prodLocations, setProdLocations] = useState({}); // project_id -> {country,state,details}
  const headerBarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, position: "sticky", top: 0, zIndex: 5, background: "#fff", padding: "10px 0", borderBottom: "1px solid #ececf1" };
  const cardStyle = { background: "#fff", border: "1px solid #e6e6f0", borderRadius: 12, padding: 12, boxShadow: "0 4px 14px rgba(16,24,40,0.06)" };
  const primaryBtnStyle = { background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" };
  const ghostBtnStyle = { background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", cursor: "pointer" };
  const PHOTO_CATEGORY_BG = { Production: "rgba(59,130,246,0.10)", Installation: "rgba(16,185,129,0.12)", "JMC":"rgba(59,130,246,0.10)", "3D": "rgba(99,102,241,0.12)", Other: "#f3f4f6" };

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
        // Enrich missing prod_status by fetching detail if summary doesn't include it
        const missing = data.items.filter((it) => {
          const po = it?.po || {};
          return !po || (!po.prod_status && !po.po_status);
        });
        if (missing.length > 0) {
          await Promise.all(
            missing.map(async (it) => {
              try {
                const r = await fetch(api(`production_get_detail.php?project_id=${it.project_id}`), { credentials: "include" });
                const dj = await r.json();
                const p = dj?.po || {};
                const st = p.prod_status || p.po_status || "";
                if (!map[it.project_id].po) map[it.project_id].po = {};
                map[it.project_id].po.prod_status = st;
              } catch (_e) {
                // ignore per-item error
              }
            })
          );
        }
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
    // also refresh local statuses
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("poStatusMap");
        const map = raw ? JSON.parse(raw) : {};
        setStatusMap(map);
      }
    } catch (_e) {
      setStatusMap({});
    }
  };

  useEffect(() => {
    fetchAll();
    // initial load of local status map in case network calls are cached
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("poStatusMap");
        const map = raw ? JSON.parse(raw) : {};
        setStatusMap(map);
      }
    } catch (_e) {
      setStatusMap({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch production locations for currently loaded projects
  useEffect(() => {
    const loadProdLocs = async () => {
      try {
        const ids = projects.map((p) => p.id);
        if (ids.length === 0) {
          setProdLocations({});
          return;
        }
        const entries = await Promise.all(
          ids.map(async (pid) => {
            try {
              const res = await fetch(api(`production_get_location.php?prod_loc_id=${pid}`), { credentials: "include" });
              const data = await res.json();
              const loc = data?.location || null;
              if (!loc) return [pid, null];
              return [pid, { country: loc.country || "", state: loc.state || "", details: loc.details || "" }];
            } catch {
              return [pid, null];
            }
          })
        );
        const map = {};
        entries.forEach(([pid, loc]) => { map[pid] = loc; });
        setProdLocations(map);
      } catch {
        setProdLocations({});
      }
    };
    loadProdLocs();
  }, [projects]);  

  const countFiles = (project, type) => {
    const list = project?.files?.[type];
    return Array.isArray(list) ? list.length : 0;
  };

  const openFiles = (project) => { setActiveFileTab("photos"); setModalProject(project); };
  const closeFiles = () => setModalProject(null);
  const role = typeof window !== "undefined" ? (localStorage.getItem("role") || "") : "";

  // no inline editor anymore; moved to standalone page
  const normalizeStatus = (s) => {
    const v = (s || "").toString().trim().toLowerCase();
    const collapsed = v.replace(/\s+/g, "");
    if (collapsed === "done") return "done";
    if (collapsed === "inprocess" || collapsed === "inprogress" || collapsed === "inproccess") return "inprocess";
    return "none";
  };

  const getStatusStyles = (status, base) => {
    const ns = normalizeStatus(status);
    const style = { ...(base || {}) };
    if (ns === "done") {
      style.background = "rgba(76,175,80,0.15)";
      style.color = "#1b5e20";
    } else if (ns === "inprocess") {
      style.background = "rgba(255,193,7,0.20)";
      style.color = "#8a6d3b";
    }
    if (!style.borderRadius) style.borderRadius = 8;
    if (!style.padding) style.padding = "6px 8px";
    return style;
  };
  const getRowBackground = (status) => {
    const ns = normalizeStatus(status);
    if (ns === "done") return "rgba(76,175,80,0.10)";
    if (ns === "inprocess") return "rgba(255,193,7,0.12)";
    return "transparent";
  };
  const renderStatusBadge = (text) => {
    const t = (text || "").toString().toLowerCase();
    let bg = "#eef2ff", color = "#3730a3", label = text || "-";
    if (!text) { bg = "#f3f4f6"; color = "#374151"; label = "-"; }
    else if (/(pending)/.test(t)) { bg = "rgba(251,191,36,0.18)"; color = "#92400e"; }
    else if (/(in\\s?progress|inprocess)/.test(t)) { bg = "rgba(59,130,246,0.18)"; color = "#1e40af"; label = "In Progress"; }
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

  const getProdLocationText = (projectId) => {
    const loc = prodLocations?.[projectId];
    if (!loc) return "-";
    const parts = [loc.country, loc.state, loc.details].filter(Boolean);
    return parts.length ? parts.join(" - ") : "-";
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
    if (filters.productionStatus) {
      const s = prodSummary[p.id] || {};
      const po = s?.po || {};
      const combined = po?.prod_status || po?.po_status || statusMap?.[String(p.id)] || "none";
      const normalized = normalizeStatus(combined);
      if (normalized !== filters.productionStatus) return false;
    }
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

    return true;
  });

  return (
    <div className={`order-page ${isSidebarOpen ? "shifted" : ""}`}>
      <div style={headerBarStyle}>
        <h2 className="order-title" style={{ margin: 0 }}>
          <span role="img" aria-label="ops" style={{ marginRight: 8 }}>📋</span>
          <strong>Operation - Projects</strong>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchAll} style={ghostBtnStyle}>
          <span className="button-icon">🔄</span> Refresh
        </button>
          <button onClick={() => setShowFilters(true)} style={primaryBtnStyle}>
          Filters
        </button>
      </div>
      </div>

      {error && <div className="error-message">❌ {error}</div>}
      {showFilters && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setShowFilters(false)}>
          <div
            className="modal-content production-filters-modal"
            style={{ maxWidth: 1200, margin: "2rem auto", borderRadius: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Filters</h3>
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
                    <select
                      className="form-input"
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="inprogress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ flex: 1, minWidth: 140 }}>
                    <label className="form-label">Production Status</label>
                    <select
                      className="form-input"
                      name="productionStatus"
                      value={filters.productionStatus}
                      onChange={handleFilterChange}
                    >
                      <option value="">All</option>
                      <option value="none">None</option>
                      <option value="inprocess">In process</option>
                      <option value="done">Done</option>
                    </select>
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
                        productionStatus: "",
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

      {loading ? (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      ) : filteredProjects.length === 0 ? (
        <p className="no-orders">No projects found.</p>
      ) : (
        <div style={cardStyle}>
          <div style={{ overflowX: "auto" }}>
          <table className="order-table" style={{ minWidth: 960, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>Created At</th>
                <th>ID</th>
                <th>Company Name</th>
                <th>Project Name</th>
                <th>Contact</th>
                <th>Job No</th>
                <th>Location</th>
                <th>Production Location</th>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => {
                const s = prodSummary[p.id] || {};
                const po = s?.po || {};
                const rowStatus = normalizeStatus(po?.prod_status || po?.po_status || statusMap?.[String(p.id)] || "none");
                const rowStyle = { background: getRowBackground(rowStatus) };
                return (
                <tr key={p.id} style={rowStyle}>
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
                  <td className="table-cell" style={{ maxWidth: 220, overflow: "auto", whiteSpace: "nowrap" }}>
                    <div style={{ maxWidth: 220, overflowX: "auto", whiteSpace: "nowrap" }}>
                      {getProdLocationText(p.id)}
                    </div>
                  </td>
                  <td className="table-cell">{renderStatusBadge(p.status)}</td>
                  {(() => {
                    const s = prodSummary[p.id] || {};
                    const po = s?.po || {};
                    const poStatus = normalizeStatus((po?.prod_status || po?.po_status || statusMap?.[String(p.id)] || "none"));
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
                            style={getStatusStyles(poStatus, {
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
                            })}
                            onClick={() => setCompactProd(false)}
                          >
                            {summaryText}
                          </td>
                          <td
                            className="table-cell"
                            style={getStatusStyles(poStatus, { borderRadius: 8, padding: "6px 8px" })}
                          >
                            {po?.warehouse_entry_date || "-"}
                          </td>
                        </>
                      );
                    }
                    // Expanded columns view
                    return (
                      <>
                        <td
                          className="table-cell"
                          style={getStatusStyles(poStatus, { borderRadius: 8, padding: "6px 8px" })}
                        >
                          {po?.po_no || "-"}
                        </td>
                        <td
                          className="table-cell"
                          style={getStatusStyles(poStatus, { borderRadius: 8, padding: "6px 8px" })}
                        >
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
                        <td
                          className="table-cell"
                          style={getStatusStyles(poStatus, { borderRadius: 8, padding: "6px 8px" })}
                        >
                          {po?.warehouse_entry_date || "-"}
                        </td>
                        <td
                          className="table-cell"
                          title={titleText}
                          style={getStatusStyles(poStatus, {
                            width: 200,
                            maxWidth: 200,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: availableText && availableText !== "-" ? "pointer" : "default",
                            textDecoration: availableText && availableText !== "-" ? "underline dotted" : "none",
                          })}
                          onClick={() => {
                            if (availableText && availableText !== "-") openMaterials(p);
                          }}
                        >
                          {availableText}
                        </td>
                        <td
                          className="table-cell"
                          title={unavailableText}
                          style={getStatusStyles(poStatus, {
                            width: 200,
                            maxWidth: 200,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            cursor: unavailableText && unavailableText !== "-" ? "pointer" : "default",
                            textDecoration: unavailableText && unavailableText !== "-" ? "underline dotted" : "none",
                          })}
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

                  <td className="table-cell" title={formatPhotoCountsTooltip(p)}>
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
                );
              })}
            </tbody>
          </table>
          </div>
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

