import React, { useEffect, useState } from "react";
import "../styles/OrderListPage.css";

const API_BASE = "https://arkanaltafawuq.com/arkan-system";
const api = (p) => `${API_BASE}/${String(p).replace(/^\/+/, "")}`;

const OrdersPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const role = typeof window !== "undefined" ? (localStorage.getItem("role") || "") : "";

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
      setProjects([]);
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteProject = async (id) => {
    try {
      setError("");
      setSuccess("");
      const ok = window.confirm(`Delete project #${id}? This action cannot be undone.`);
      if (!ok) return;
      const res = await fetch(api("projects_delete.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id) }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Delete failed");
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSuccess(`Project #${id} deleted`);
      setTimeout(() => setSuccess(""), 2500);
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  };

  if (role !== "account manager" && role !== "admin") {
    return (
      <div className="order-page">
        <h2 className="order-title">Orders</h2>
        <div className="error-message">❌ Access restricted to account manager role</div>
      </div>
    );
  }

  return (
    <div className="order-page">
      <h2 className="order-title">Orders - Projects</h2>
      {error && <div className="error-message">❌ {error}</div>}
      {success && <div className="success-message">✅ {success}</div>}
    
      {loading ? (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      ) : projects.length === 0 ? (
        <p className="no-orders">No projects found.</p>
      ) : (
        <table className="order-table" style={{overflowX: "auto", whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Project ID</th>
              <th>Job Number</th>
              <th>Company Name</th>
              <th>Project Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="table-cell">{p.id}</td>
                <td className="table-cell">{p.job_number || p.job_no || "-"}</td>
                <td className="table-cell">{p.company_name || "-"}</td>
                <td className="table-cell">{p.project_name || p.name || "-"}</td>
                <td className="table-cell">
                  <span
                    className="icon-button"                        
                    style={{ cursor: "pointer", padding: 4, fontSize: 15 }}
                    title={`Delete #${p.id}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Delete project ${p.id}`}
                    onClick={() => deleteProject(p.id)}
                    onKeyPress={(e) => (e.key === "Enter" || e.key === " ") && deleteProject(p.id)}
                  >
                    🗑️
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrdersPage;
