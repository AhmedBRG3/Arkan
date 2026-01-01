// src/components/WarehousePage.jsx
import React, { useEffect, useMemo, useState } from "react";

const API = "https://arkanaltafawuq.com/arkan-system";

const cardStyle = { 
  background: "#fff", 
  border: "1px solid #e6e6f0", 
  borderRadius: 12, 
  padding: 20, 
  boxShadow: "0 4px 14px rgba(16,24,40,0.08)", 
  marginBottom: 24 
};
const sectionTitleStyle = { 
  margin: "0 0 20px 0", 
  fontSize: 20, 
  fontWeight: 700, 
  color: "#1f2937" 
};
const inputStyle = { 
  borderRadius: 10, 
  padding: "10px 12px", 
  border: "1px solid #e5e7eb", 
  fontSize: 14, 
  width: "100%", 
  boxSizing: "border-box",
  transition: "border-color 0.2s"
};
const labelStyle = { 
  display: "block", 
  fontSize: 13, 
  fontWeight: 600, 
  color: "#374151", 
  marginBottom: 6 
};
const buttonPrimary = {
  background: "linear-gradient(90deg, #475569 0%, #334155 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 20px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(71,85,105,0.2)",
  transition: "all 0.2s"
};
const buttonSecondary = {
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 20px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  color: "#374151",
  transition: "all 0.2s"
};

const WarehousePage = () => {
  const [tab, setTab] = useState("stock"); // stock | add | in | out | movements
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // STOCK filters (NEW)
  const [stockFilters, setStockFilters] = useState({
    q: "",             // text search (code/name/desc/location)
    category: "",      // exact match
    location: "",      // exact match
    lowOnly: false,    // only items below/at reorder level
    minQty: "",        // >=
    maxQty: "",        // <=
  });

  // Add Item form
  const [newItem, setNewItem] = useState({
    item_code: "",
    item_name: "",
    description: "",
    category: "",
    quantity: "", // initial qty
    unit: "pcs",
    purchase_price: "",
    selling_price: "",
    supplier_id: "",
    reorder_level: "",
    location: "",
  });

  // IN form
  const [inForm, setInForm] = useState({
    item_id: "",
    qty: "",
    unit_cost: "",
    supplier_id: "",
    po_number: "",
    note: "",
    receipt_date: "",
  });

  // OUT form
  const [outForm, setOutForm] = useState({
    item_id: "",
    qty: "",
    unit_price: "",
    reason: "usage",
    order_id: "",
    supplier_id: "",
    po_number: "",
    note: "",
    issued_at: "",
  });

  // Movements list
  const [inRows, setInRows] = useState([]);
  const [outRows, setOutRows] = useState([]);
  const [inError, setInError] = useState("");
  const [outError, setOutError] = useState("");
  const [filters, setFilters] = useState({
    item_id: "",
    from: "",
    to: "",
    limit: 100,
  });

  const username = localStorage.getItem("username") || "";

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/warehouse_get_items.php`);
      const data = await res.json();
      if (data.success) setItems(Array.isArray(data.items) ? data.items : []);
      else setItems([]);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchIn = async () => {
    const qs = new URLSearchParams();
    if (filters.item_id) qs.append("item_id", filters.item_id);
    if (filters.from) qs.append("from", filters.from);
    if (filters.to) qs.append("to", filters.to);
    if (filters.limit) qs.append("limit", filters.limit);
    try {
      setInError("");
      const res = await fetch(`${API}/warehouse_get_in.php?` + qs.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.success) {
        setInRows(Array.isArray(data.items) ? data.items : []);
      } else {
        setInRows([]);
        setInError((data && data.message) ? String(data.message) : "Failed to load IN movements");
      }
    } catch (e) {
      console.error("fetchIn error", e);
      setInRows([]);
      setInError("Could not load IN movements. Please try again.");
    }
  };

  const fetchOut = async () => {
    const qs = new URLSearchParams();
    if (filters.item_id) qs.append("item_id", filters.item_id);
    if (filters.from) qs.append("from", filters.from);
    if (filters.to) qs.append("to", filters.to);
    if (filters.limit) qs.append("limit", filters.limit);
    
    try {
      // First get the out items
      const outRes = await fetch(`${API}/warehouse_get_out.php?` + qs.toString());
      const outData = await outRes.json();
      
      if (outData.success) {
        // Then get the latest unit cost for each item
        const itemsWithCosts = await Promise.all(
          outData.items.map(async (item) => {
            try {
              const costRes = await fetch(`${API}/warehouse_get_in.php?item_id=${item.item_id}&limit=1`);
              const costData = await costRes.json();
              const latestCost = costData.success && costData.items.length > 0 
                ? parseFloat(costData.items[0].unit_cost) 
                : 0;
              
              return {
                ...item,
                unit_price: parseFloat(item.unit_price) || latestCost
              };
            } catch (e) {
              console.error(`Error fetching cost for item ${item.item_id}:`, e);
              return {
                ...item,
                unit_price: parseFloat(item.unit_price) || 0
              };
            }
          })
        );
        
        setOutRows(itemsWithCosts);
        setOutError("");
      } else {
        setOutRows([]);
        setOutError((outData && outData.message) ? String(outData.message) : "Failed to load OUT movements");
      }
    } catch (error) {
      console.error('Error in fetchOut:', error);
      setOutRows([]);
      setOutError("Could not load OUT movements. Please try again.");
    }
  };

  useEffect(() => {
    if (tab === "stock") fetchItems();
    if (tab === "in") { fetchItems(); fetchIn(); }
    if (tab === "out") { fetchItems(); fetchOut(); }
    if (tab === "movements") { fetchIn(); fetchOut(); }
  }, [tab]); // eslint-disable-line

  const addItem = async (e) => {
    e.preventDefault();
    const payload = {
      item_code: newItem.item_code,
      item_name: newItem.item_name,
      description: newItem.description,
      category: newItem.category,
      qty: parseFloat(newItem.quantity || 0),
      unit: newItem.unit,
      purchase_price: parseFloat(newItem.purchase_price || 0),
      selling_price: parseFloat(newItem.selling_price || 0),
      supplier_id: newItem.supplier_id || null,
      reorder_level: parseFloat(newItem.reorder_level || 0),
      location: newItem.location,
    };

    const res = await fetch(`${API}/warehouse_add_item.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      alert("✅ Item added");
      setNewItem({
        item_code: "",
        item_name: "",
        description: "",
        category: "",
        quantity: "",
        unit: "pcs",
        purchase_price: "",
        selling_price: "",
        supplier_id: "",
        reorder_level: "",
        location: "",
      });
      setTab("stock");
      fetchItems();
    } else {
      alert("❌ " + (data.message || "Failed to add item"));
    }
  };

  const addIn = async (e) => {
    e.preventDefault();
    const payload = {
      item_id: parseInt(inForm.item_id, 10),
      qty: parseFloat(inForm.qty || 0),
      unit_cost: inForm.unit_cost === "" ? null : parseFloat(inForm.unit_cost),
      supplier_id: inForm.supplier_id === "" ? null : parseInt(inForm.supplier_id, 10),
      po_number: inForm.po_number || null,
      note: inForm.note || null,
      received_by: username || null,
      receipt_date: inForm.receipt_date || null,
    };
    const res = await fetch(`${API}/warehouse_add_in.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      alert("✅ Stock IN recorded");
      setInForm({ item_id: "", qty: "", unit_cost: "", supplier_id: "", po_number: "", note: "", receipt_date: "" });
      fetchItems();
      fetchIn();
    } else {
      alert("❌ " + (data.message || "Failed to add IN"));
    }
  };

  const addOut = async (e) => {
    e.preventDefault();
    const payload = {
      item_id: parseInt(outForm.item_id, 10),
      qty: parseFloat(outForm.qty || 0),
      unit_price: outForm.unit_price === "" ? null : parseFloat(outForm.unit_price),
      reason: outForm.reason || "usage",
      order_id: outForm.order_id === "" ? null : outForm.order_id,
      supplier_id: outForm.supplier_id === "" ? null : outForm.supplier_id,
      po_number: outForm.po_number || null,
      note: outForm.note || null,
      issued_by: username || null,
      issued_at: outForm.issued_at || null,
    };
    const res = await fetch(`${API}/warehouse_add_out.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      alert("✅ Stock OUT recorded");
      setOutForm({
        item_id: "",
        qty: "",
        unit_price: "",
        reason: "usage",
        order_id: "",
        supplier_id: "",
        po_number: "",
        note: "",
        issued_at: "",
      });
      fetchItems();
      fetchOut();
    } else {
      alert("❌ " + (data.message || "Failed to add OUT"));
    }
  };

  const quickAdjust = async (item_id, delta) => {
    if (delta > 0) {
      await fetch(`${API}/warehouse_add_in.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id,
          qty: 1,
          unit_cost: null,
          supplier_id: null,
          po_number: "quick-adjust",
          note: delta > 0 ? "quick +1" : "quick -1",
          received_by: username || null,
        }),
      });
    } else {
      await fetch(`${API}/warehouse_add_out.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id,
          qty: 1,
          reason: "adjustment",
          order_id: null,
          note: "quick -1",
          issued_by: username || null,
        }),
      });
    }
    fetchItems();
    if (tab === "movements") { fetchIn(); fetchOut(); }
  };

  const itemsById = useMemo(() => {
    const map = new Map();
    items.forEach((i) => map.set(String(i.item_id), i));
    return map;
  }, [items]);

  // === STOCK: derived UI data (NEW) ===
  const categoryOptions = useMemo(() => {
    const set = new Set(items.map(i => (i.category || "").trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const locationOptions = useMemo(() => {
    const set = new Set(items.map(i => (i.location || "").trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = stockFilters.q.trim().toLowerCase();
    const cat = stockFilters.category.trim().toLowerCase();
    const loc = stockFilters.location.trim().toLowerCase();
    const min = stockFilters.minQty === "" ? null : Number(stockFilters.minQty);
    const max = stockFilters.maxQty === "" ? null : Number(stockFilters.maxQty);

    return items.filter(it => {
      const qty = Number(it.quantity || 0);
      const reorder = Number(it.reorder_level || 0);

      if (stockFilters.lowOnly && !(qty <= reorder)) return false;

      if (min !== null && !(qty >= min)) return false;
      if (max !== null && !(qty <= max)) return false;

      if (cat && String(it.category || "").toLowerCase() !== cat) return false;
      if (loc && String(it.location || "").toLowerCase() !== loc) return false;

      if (q) {
        const hay = [
          it.item_code,
          it.item_name,
          it.description,
          it.location,
          it.category,
        ].map(v => String(v || "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [items, stockFilters]);

  // Export current filtered stock to CSV (NEW)
  const exportStockCSV = () => {
    const headers = [
      "ID","Code","Name","Quantity","Unit","Reorder Level","Location","Category",
      "Purchase Price","Selling Price","Supplier ID","Description"
    ];

    const rows = filteredItems.map(it => ([
      it.item_id ?? "",
      it.item_code ?? "",
      it.item_name ?? "",
      it.quantity ?? "",
      it.unit ?? "",
      it.reorder_level ?? "",
      it.location ?? "",
      it.category ?? "",
      it.purchase_price ?? "",
      it.selling_price ?? "",
      it.supplier_id ?? "",
      (it.description ?? "").replace(/\r?\n/g, " "),
    ]));

    const escape = (v) => {
      const s = String(v ?? "");
      // quote if contains quotes, commas, or newlines
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0,10);
    a.download = `warehouse_stock_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const clearStockFilters = () => {
    setStockFilters({ q: "", category: "", location: "", lowOnly: false, minQty: "", maxQty: "" });
  };

  return (
    <div style={{ padding: "32px", maxWidth: 1600, margin: "0 auto", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          marginBottom: 8,
          fontSize: 32,
          fontWeight: 700,
          color: "#1f2937",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{ fontSize: 36 }}>📦</span>
          Warehouse Management
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Manage inventory, stock movements, and warehouse operations</p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: 12, 
        marginBottom: 24,
        background: "#fff",
        padding: 8,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        border: "1px solid #e6e6f0"
      }}>
        {["stock", "add", "in", "out", "movements"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...buttonSecondary,
              background: tab === t ? "linear-gradient(90deg, #475569 0%, #334155 100%)" : "#f3f4f6",
              color: tab === t ? "#fff" : "#374151",
              border: tab === t ? "none" : "1px solid #e5e7eb",
              boxShadow: tab === t ? "0 2px 8px rgba(71,85,105,0.2)" : "none",
              padding: "10px 24px",
              textTransform: "capitalize",
              fontWeight: 600
            }}
            onMouseOver={e => {
              if (tab !== t) e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseOut={e => {
              if (tab !== t) e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            {t === "stock" && "📊 "}
            {t === "add" && "➕ "}
            {t === "in" && "⬆️ "}
            {t === "out" && "⬇️ "}
            {t === "movements" && "🔄 "}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* STOCK */}
      {tab === "stock" && (
        <div>
          {/* Toolbar */}
          <div style={{ 
            display: "flex", 
            gap: 12, 
            marginBottom: 20, 
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            <button
              style={{
                ...buttonSecondary,
                background: loading ? "#e5e7eb" : "#f3f4f6"
              }}
              onClick={fetchItems}
              disabled={loading}
              title="Refresh items"
              onMouseOver={e => {
                if (!loading) e.currentTarget.style.background = "#e5e7eb";
              }}
              onMouseOut={e => {
                if (!loading) e.currentTarget.style.background = "#f3f4f6";
              }}
            >
              {loading ? "⏳ Loading..." : "🔄 Refresh"}
            </button>
            <button
              style={buttonPrimary}
              onClick={exportStockCSV}
              title="Export current view to CSV"
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              ⭳ Export CSV
            </button>
            <div style={{ 
              alignSelf: "center", 
              color: "#6b7280",
              fontSize: 14,
              fontWeight: 500,
              marginLeft: "auto"
            }}>
              Showing <strong style={{ color: "#1f2937" }}>{filteredItems.length}</strong> of <strong style={{ color: "#1f2937" }}>{items.length}</strong> items
            </div>
          </div>

          {/* Filters */}
          <div style={{ 
            ...cardStyle, 
            display: "grid", 
            gap: 16, 
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
            marginBottom: 24
          }}>
            <input
              style={inputStyle}
              placeholder="🔍 Search (code, name, description, location)"
              value={stockFilters.q}
              onChange={(e) => setStockFilters({ ...stockFilters, q: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = "#475569"}
              onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
            />
            <select
              style={inputStyle}
              value={stockFilters.category}
              onChange={(e) => setStockFilters({ ...stockFilters, category: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = "#475569"}
              onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
            >
              <option value="">All categories</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              style={inputStyle}
              value={stockFilters.location}
              onChange={(e) => setStockFilters({ ...stockFilters, location: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = "#475569"}
              onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
            >
              <option value="">All locations</option>
              {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              placeholder="Min qty"
              value={stockFilters.minQty}
              onChange={(e) => setStockFilters({ ...stockFilters, minQty: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = "#475569"}
              onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
            />
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              placeholder="Max qty"
              value={stockFilters.maxQty}
              onChange={(e) => setStockFilters({ ...stockFilters, maxQty: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = "#475569"}
              onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
            />
            <label style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              padding: "10px 12px",
              cursor: "pointer"
            }}>
              <input
                type="checkbox"
                checked={stockFilters.lowOnly}
                onChange={(e) => setStockFilters({ ...stockFilters, lowOnly: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>Low only</span>
            </label>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button
                style={buttonSecondary}
                onClick={clearStockFilters}
                title="Clear all filters"
                onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"}
                onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}
              >
                🗑️ Clear Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={cardStyle}>
            <div style={{ overflowX: "auto" }}>
              <table width="100%" style={{
                borderCollapse: "collapse",
                background: "#fff",
                borderRadius: 12,
                overflow: "hidden"
              }}>
                <thead>
                  <tr style={{
                    background: "linear-gradient(90deg, #f9fafb 0%, #f3f4f6 100%)",
                    borderBottom: "2px solid #e5e7eb"
                  }}>
                    <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>ID</th>
                    <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Code</th>
                    <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Name</th>
                    <th style={{padding: "14px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Qty</th>
                    <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Unit</th>
                    <th style={{padding: "14px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Unit Cost</th>
                    <th style={{padding: "14px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Total Value</th>
                    <th style={{padding: "14px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Min</th>
                    <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Location</th>
                    <th style={{padding: "14px 12px", textAlign: "center", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Quick +/-</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it, idx) => {
                    const low = Number(it.quantity) <= Number(it.reorder_level || 0);
                    return (
                      <tr 
                        key={it.item_id} 
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          background: low ? "rgba(239,68,68,0.05)" : (idx % 2 === 0 ? "#fff" : "#fafafa"),
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = low ? "rgba(239,68,68,0.1)" : "#f0f9ff"}
                        onMouseLeave={e => e.currentTarget.style.background = low ? "rgba(239,68,68,0.05)" : (idx % 2 === 0 ? "#fff" : "#fafafa")}
                      >
                        <td style={{padding: "12px", fontSize: 14, color: "#1f2937", fontWeight: 500}}>{it.item_id}</td>
                        <td style={{padding: "12px", fontSize: 14, color: "#1f2937"}}>{it.item_code || "-"}</td>
                        <td style={{padding: "12px", fontSize: 14, color: "#1f2937", fontWeight: 500}}>{it.item_name}</td>
                        <td style={{padding: "12px", textAlign: "right", fontSize: 14, color: "#1f2937", fontWeight: 600}}>{it.quantity}</td>
                        <td style={{padding: "12px", fontSize: 14, color: "#6b7280"}}>{it.unit}</td>
                        <td style={{padding: "12px", textAlign: "right", fontSize: 14, color: "#1f2937", fontFamily: "monospace"}}>{it.purchase_price ? `SAR ${parseFloat(it.purchase_price).toFixed(2)}` : '-'}</td>
                        <td style={{padding: "12px", textAlign: "right", fontSize: 14, color: "#1f2937", fontWeight: 600, fontFamily: "monospace"}}>SAR {(parseFloat(it.quantity || 0) * parseFloat(it.purchase_price || 0)).toFixed(2)}</td>
                        <td style={{padding: "12px", textAlign: "right", fontSize: 14, color: low ? "#dc2626" : "#1f2937", fontWeight: low ? 600 : 400}}>{it.reorder_level ?? "-"}</td>
                        <td style={{padding: "12px", fontSize: 14, color: "#6b7280"}}>{it.location ?? "-"}</td>
                        <td style={{padding: "12px", textAlign: "center"}}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              style={{
                                ...buttonSecondary,
                                background: "rgba(5,150,105,0.1)",
                                color: "#047857",
                                border: "1px solid rgba(5,150,105,0.2)",
                                padding: "6px 12px",
                                fontSize: 12
                              }}
                              onClick={() => quickAdjust(it.item_id, +1)}
                              onMouseOver={e => e.currentTarget.style.background = "rgba(5,150,105,0.15)"}
                              onMouseOut={e => e.currentTarget.style.background = "rgba(5,150,105,0.1)"}
                            >
                              +1
                            </button>
                            <button
                              style={{
                                ...buttonSecondary,
                                background: "rgba(153,27,27,0.1)",
                                color: "#991b1b",
                                border: "1px solid rgba(153,27,27,0.2)",
                                padding: "6px 12px",
                                fontSize: 12
                              }}
                              onClick={() => quickAdjust(it.item_id, -1)}
                              onMouseOver={e => e.currentTarget.style.background = "rgba(153,27,27,0.15)"}
                              onMouseOut={e => e.currentTarget.style.background = "rgba(153,27,27,0.1)"}
                            >
                              -1
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{textAlign: "center", padding: "48px", color: "#9ca3af", fontSize: 14}}>
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD ITEM */}
      {tab === "add" && (
        <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
          <form onSubmit={addItem} style={{ ...cardStyle, display: "grid", gap: 16 }}>
            <h2 style={sectionTitleStyle}>➕ Add New Item</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              <div>
                <label style={labelStyle}>Item Code (unique)</label>
                <input
                  style={inputStyle}
                  placeholder="Enter item code"
                  value={newItem.item_code}
                  onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Item Name *</label>
                <input
                  style={inputStyle}
                  placeholder="Enter item name"
                  required
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input
                  style={inputStyle}
                  placeholder="Enter category"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input
                  style={inputStyle}
                  placeholder="Enter location"
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <input
                  style={inputStyle}
                  placeholder="pcs, m, kg, etc"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Initial Quantity</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Reorder Level</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.reorder_level}
                  onChange={(e) => setNewItem({ ...newItem, reorder_level: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Purchase Price</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.purchase_price}
                  onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Selling Price</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newItem.selling_price}
                  onChange={(e) => setNewItem({ ...newItem, selling_price: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Supplier ID (optional)</label>
                <input
                  style={inputStyle}
                  placeholder="Enter supplier ID"
                  value={newItem.supplier_id}
                  onChange={(e) => setNewItem({ ...newItem, supplier_id: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                placeholder="Enter item description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
              />
            </div>
            <div>
              <button 
                style={buttonPrimary} 
                type="submit"
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                💾 Save Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STOCK IN */}
      {tab === "in" && (
        <div style={{ display: "grid", gap: 24 }}>
          <form onSubmit={addIn} style={{ ...cardStyle, display: "grid", gap: 16 }}>
            <h2 style={sectionTitleStyle}>⬆️ Stock IN</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <div>
                <label style={labelStyle}>Item</label>
                <select
                  style={inputStyle}
                  value={inForm.item_id}
                  onChange={(e) => setInForm({ ...inForm, item_id: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <option value="">Select Item</option>
                  {items.map((i) => (
                    <option key={i.item_id} value={i.item_id}>
                      #{i.item_id} — {i.item_name} ({i.item_code || "no-code"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={inForm.qty}
                  onChange={(e) => setInForm({ ...inForm, qty: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Unit Cost (optional)</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={inForm.unit_cost}
                  onChange={(e) => setInForm({ ...inForm, unit_cost: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Supplier ID (optional)</label>
                <input
                  style={inputStyle}
                  placeholder="Enter supplier ID"
                  value={inForm.supplier_id}
                  onChange={(e) => setInForm({ ...inForm, supplier_id: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>PO Number</label>
                <input
                  style={inputStyle}
                  placeholder="Enter PO number"
                  value={inForm.po_number}
                  onChange={(e) => setInForm({ ...inForm, po_number: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Receipt Date (optional)</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={inForm.receipt_date}
                  onChange={(e) => setInForm({ ...inForm, receipt_date: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Note</label>
                <input
                  style={inputStyle}
                  placeholder="Enter note"
                  value={inForm.note}
                  onChange={(e) => setInForm({ ...inForm, note: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>
            <div>
              <button 
                style={buttonPrimary} 
                type="submit"
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                ➕ Add IN
              </button>
            </div>
          </form>

          {inError && (
            <div style={{ 
              padding: "14px 18px", 
              background: "rgba(239,68,68,0.1)", 
              color: "#dc2626", 
              border: "1px solid rgba(239,68,68,0.3)", 
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14
            }}>
              ❌ {inError}
            </div>
          )}

          {/* IN LIST */}
          <MovementFilters filters={filters} setFilters={setFilters} onApply={() => { fetchIn(); }} />
          <MovementInTable rows={inRows} />
        </div>
      )}

      {/* STOCK OUT */}
      {tab === "out" && (
        <div style={{ display: "grid", gap: 24 }}>
          <form onSubmit={addOut} style={{ ...cardStyle, display: "grid", gap: 16 }}>
            <h2 style={sectionTitleStyle}>⬇️ Stock OUT</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <div>
                <label style={labelStyle}>Item</label>
                <select
                  style={inputStyle}
                  value={outForm.item_id}
                  onChange={(e) => setOutForm({ ...outForm, item_id: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <option value="">Select Item</option>
                  {items.map((i) => (
                    <option key={i.item_id} value={i.item_id}>
                      #{i.item_id} — {i.item_name} ({i.item_code || "no-code"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={outForm.qty}
                  onChange={(e) => setOutForm({ ...outForm, qty: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Reason</label>
                <select
                  style={inputStyle}
                  value={outForm.reason}
                  onChange={(e) => setOutForm({ ...outForm, reason: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                >
                  <option value="usage">Usage</option>
                  <option value="production">Production</option>
                  <option value="sale">Sale</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Unit Price</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.0001"
                  placeholder="0.0000"
                  value={outForm.unit_price}
                  onChange={(e) => setOutForm({ ...outForm, unit_price: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Issue Date (optional)</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={outForm.issued_at}
                  onChange={(e) => setOutForm({ ...outForm, issued_at: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Supplier ID (optional)</label>
                <input
                  style={inputStyle}
                  placeholder="Enter supplier ID"
                  value={outForm.supplier_id}
                  onChange={(e) => setOutForm({ ...outForm, supplier_id: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={labelStyle}>Order ID (optional)</label>
                <input
                  style={inputStyle}
                  placeholder="Enter order ID"
                  value={outForm.order_id}
                  onChange={(e) => setOutForm({ ...outForm, order_id: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Note</label>
                <input
                  style={inputStyle}
                  placeholder="Enter note"
                  value={outForm.note}
                  onChange={(e) => setOutForm({ ...outForm, note: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = "#475569"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>
            <div>
              <button 
                style={buttonPrimary} 
                type="submit"
                onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                ➖ Add OUT
              </button>
            </div>
          </form>

          {outError && (
            <div style={{ 
              padding: "14px 18px", 
              background: "rgba(239,68,68,0.1)", 
              color: "#dc2626", 
              border: "1px solid rgba(239,68,68,0.3)", 
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14
            }}>
              ❌ {outError}
            </div>
          )}

          {/* OUT LIST */}
          <MovementFilters filters={filters} setFilters={setFilters} onApply={() => { fetchOut(); }} />
          <MovementOutTable rows={outRows} itemsById={itemsById} />
        </div>
      )}

      {/* MOVEMENTS (combined) */}
      {tab === "movements" && (
        <div style={{ gap: 24 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 24,
            ...cardStyle,
            padding: "16px 20px"
          }}>
            <h2 style={sectionTitleStyle}>🔄 Inventory Movements</h2>
            <button 
              style={buttonPrimary}
              onClick={() => { fetchIn(); fetchOut(); }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              🔃 Refresh
            </button>
          </div>
          <MovementFilters 
            filters={filters} 
            setFilters={setFilters} 
            onApply={() => { fetchIn(); fetchOut(); }} 
          />
          <div style={{ marginTop: '20px' }}>
            <CombinedMovementsTable inRows={inRows} outRows={outRows} />
          </div>
        </div>
      )}
    </div>
  );
};

const MovementFilters = ({ filters, setFilters, onApply }) => {
  return (
    <div style={{ ...cardStyle, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <input
        style={{ ...inputStyle, flex: "1 1 150px", minWidth: 120 }}
        placeholder="Item ID"
        value={filters.item_id}
        onChange={(e) => setFilters({ ...filters, item_id: e.target.value })}
        onFocus={e => e.currentTarget.style.borderColor = "#475569"}
        onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
      />
      <input
        style={{ ...inputStyle, flex: "1 1 150px", minWidth: 120 }}
        type="date"
        value={filters.from}
        onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        onFocus={e => e.currentTarget.style.borderColor = "#475569"}
        onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
      />
      <input
        style={{ ...inputStyle, flex: "1 1 150px", minWidth: 120 }}
        type="date"
        value={filters.to}
        onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        onFocus={e => e.currentTarget.style.borderColor = "#475569"}
        onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
      />
      <input
        style={{ ...inputStyle, width: 100 }}
        type="number"
        placeholder="Limit"
        value={filters.limit}
        onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value || 100) })}
        onFocus={e => e.currentTarget.style.borderColor = "#475569"}
        onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
      />
      <button 
        style={buttonPrimary} 
        onClick={onApply}
        onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
        onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        🔍 Apply Filters
      </button>
    </div>
  );
};

const MovementInTable = ({ rows }) => {
  const [filters, setFilters] = useState({
    date: "",
    item: "",
    qty: "",
    unitPrice: "",
    totalCost: "",
    supplier: "",
    po: "",
    by: "",
    note: "",
  });

  const matchNumber = (value, expr) => {
    if (!expr) return true;
    const v = Number(value || 0);
    const m = String(expr).trim().match(/^(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) return String(value ?? "").toLowerCase().includes(String(expr).toLowerCase());
    const op = m[1] || "=";
    const n = Number(m[2]);
    switch (op) {
      case ">": return v > n;
      case "<": return v < n;
      case ">=": return v >= n;
      case "<=": return v <= n;
      default: return v === n;
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const dateOk = String(r.received_at || "").toLowerCase().includes(filters.date.toLowerCase());
      const itemStr = `#${r.item_id} ${r.item_code} ${r.item_name}`;
      const itemOk = itemStr.toLowerCase().includes(filters.item.toLowerCase());
      const qtyOk = matchNumber(r.qty, filters.qty);
      const totalCost = parseFloat(r.total_cost || 0);
      const qty = parseFloat(r.qty || 0);
      const unitPrice = qty ? totalCost / qty : (parseFloat(r.unit_cost || 0) || 0);
      const unitOk = matchNumber(unitPrice, filters.unitPrice);
      const totalOk = matchNumber(totalCost, filters.totalCost);
      const supplierOk = String(r.supplier_id ?? "").toLowerCase().includes(filters.supplier.toLowerCase());
      const poOk = String(r.po_number ?? "").toLowerCase().includes(filters.po.toLowerCase());
      const byOk = String(r.received_by ?? "").toLowerCase().includes(filters.by.toLowerCase());
      const noteOk = String(r.note ?? "").toLowerCase().includes(filters.note.toLowerCase());
      return dateOk && itemOk && qtyOk && unitOk && totalOk && supplierOk && poOk && byOk && noteOk;
    });
  }, [rows, filters]);

  // Calculate total value from filtered rows
  const totalValue = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + (parseFloat(row.total_cost) || 0), 0);
  }, [filteredRows]);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total Cost</th>
              <th>IN Stock</th>
              <th>Supplier</th>
              <th>Invoice Number</th>
              <th>By</th>
              <th>Note</th>
            </tr>
            <tr>
              <th><input style={inputStyle} placeholder="Filter date" value={filters.date} onChange={(e)=>setFilters({...filters,date:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Filter item" value={filters.item} onChange={(e)=>setFilters({...filters,item:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Qty (e.g. >=5)" value={filters.qty} onChange={(e)=>setFilters({...filters,qty:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Unit (e.g. <10)" value={filters.unitPrice} onChange={(e)=>setFilters({...filters,unitPrice:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Total (e.g. =100)" value={filters.totalCost} onChange={(e)=>setFilters({...filters,totalCost:e.target.value})} /></th>
              <th></th>
              <th><input style={inputStyle} placeholder="Supplier" value={filters.supplier} onChange={(e)=>setFilters({...filters,supplier:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Invoice Number" value={filters.po} onChange={(e)=>setFilters({...filters,po:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="By" value={filters.by} onChange={(e)=>setFilters({...filters,by:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Note" value={filters.note} onChange={(e)=>setFilters({...filters,note:e.target.value})} /></th>
          </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => {
              const qty = parseFloat(r.qty || 0);
              const totalCost = parseFloat(r.total_cost || 0);
              const unitPrice = qty ? totalCost / qty : (parseFloat(r.unit_cost || 0) || 0);
              return (
                <tr key={r.id}>
                  <td>{r.received_at}</td>
                  <td>#{r.item_id} — {r.item_code} / {r.item_name}</td>
                  <td style={{ color: "#0a6", fontWeight: 600 }}>+{r.qty}</td>
                  <td>{unitPrice ? `${unitPrice.toFixed(2)}` : "-"}</td>
                  <td style={{ fontWeight: 600 }}>
                    {totalCost ? `SAR ${totalCost.toFixed(2)}` : "-"}
                  </td>
                  <td>{r.Item_Stock ?? '-'}</td>
                  <td>{r.supplier_id ?? "-"}</td>
                  <td>{r.po_number ?? "-"}</td>
                  <td>{r.received_by ?? "-"}</td>
                  <td style={{ maxWidth: 200, overflowX: "auto", whiteSpace: "nowrap" }}>
                    <div style={{ maxWidth: 200, overflowX: "auto", whiteSpace: "nowrap" }}>
                      {r.note ?? "-"}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan="10">No IN movements</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ 
        textAlign: 'right', 
        fontSize: '1.1em', 
        fontWeight: 'bold',
        marginTop: '10px',
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px'
      }}>
        Total IN Value: SAR {totalValue.toFixed(2)}
      </div>
    </div>
  );
};

const MovementOutTable = ({ rows }) => {
  const [filters, setFilters] = useState({
    date: "",
    item: "",
    qty: "",
    unitPrice: "",
    totalValue: "",
    iNStock: "",
    reason: "",
    po: "",
    supplier: "",
    by: "",
    note: "",
  });

  const matchNumber = (value, expr) => {
    if (!expr) return true;
    const v = Number(value || 0);
    const m = String(expr).trim().match(/^(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) return String(value ?? "").toLowerCase().includes(String(expr).toLowerCase());
    const op = m[1] || "=";
    const n = Number(m[2]);
    switch (op) {
      case ">": return v > n;
      case "<": return v < n;
      case ">=": return v >= n;
      case "<=": return v <= n;
      default: return v === n;
    }
  };

  const filteredRows = useMemo(() => {
    return rows.map((r) => {
      const qtyAbs = Math.abs(parseFloat(r.qty || 0));
      const totalVal = (parseFloat(r.unit_price || 0)) * (parseFloat(r.qty || 0));
      const unitPrice = qtyAbs ? Math.abs(totalVal) / qtyAbs : 0;
      return { ...r, _qtyAbs: qtyAbs, _unitPrice: unitPrice, _totalVal: totalVal };
    }).filter((r) => {
      const dateOk = String(r.issued_at || "").toLowerCase().includes(filters.date.toLowerCase());
      const itemStr = `#${r.item_id} ${r.item_code} ${r.item_name}`;
      const itemOk = itemStr.toLowerCase().includes(filters.item.toLowerCase());
      const qtyOk = matchNumber(r._qtyAbs, filters.qty);
      const unitOk = matchNumber(r._unitPrice, filters.unitPrice);
      const totalOk = matchNumber(Math.abs(r._totalVal), filters.totalValue);
      const reasonOk = String(r.reason || "").toLowerCase().includes(filters.reason.toLowerCase());
      const poOk = String(r.po_number || r.order_id || "").toLowerCase().includes(filters.po.toLowerCase());
      const supplierOk = String(r.supplier_id || "").toLowerCase().includes(filters.supplier.toLowerCase());
      const byOk = String(r.issued_by || "").toLowerCase().includes(filters.by.toLowerCase());
      const noteOk = String(r.note || "").toLowerCase().includes(filters.note.toLowerCase());
      return dateOk && itemOk && qtyOk && unitOk && totalOk && reasonOk && poOk && supplierOk && byOk && noteOk;
    });
  }, [rows, filters]);

  // Calculate totals from filtered rows
  const { totalQty, totalValue } = useMemo(() => {
    return filteredRows.reduce((acc, row) => {
      const qty = parseFloat(row._qtyAbs || 0);
      const unitPrice = parseFloat(row._unitPrice || 0);
      return {
        totalQty: acc.totalQty + qty,
        totalValue: acc.totalValue + (qty * unitPrice)
      };
    }, { totalQty: 0, totalValue: 0 });
  }, [filteredRows]);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total Value</th>
              <th>IN Stock</th>
              <th>Reason</th>
              <th>PO/Order #</th>
              <th>Supplier</th>
              <th>By</th>
              <th>Note</th>
            </tr>
            <tr>
              <th><input style={inputStyle} placeholder="Filter date" value={filters.date} onChange={(e)=>setFilters({...filters,date:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Filter item" value={filters.item} onChange={(e)=>setFilters({...filters,item:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Qty (e.g. >=5)" value={filters.qty} onChange={(e)=>setFilters({...filters,qty:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Unit (e.g. <10)" value={filters.unitPrice} onChange={(e)=>setFilters({...filters,unitPrice:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Total (e.g. =100)" value={filters.totalValue} onChange={(e)=>setFilters({...filters,totalValue:e.target.value})} /></th>
              <th></th>
              <th><input style={inputStyle} placeholder="Reason" value={filters.reason} onChange={(e)=>setFilters({...filters,reason:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="PO/Order" value={filters.po} onChange={(e)=>setFilters({...filters,po:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Supplier" value={filters.supplier} onChange={(e)=>setFilters({...filters,supplier:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="By" value={filters.by} onChange={(e)=>setFilters({...filters,by:e.target.value})} /></th>
              <th><input style={inputStyle} placeholder="Note" value={filters.note} onChange={(e)=>setFilters({...filters,note:e.target.value})} /></th>
          </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => {
              const qty = Math.abs(parseFloat(r.qty || 0));
              const totalVal = (parseFloat(r.unit_price || 0)) * (parseFloat(r.qty || 0));
              const unitPrice = qty ? Math.abs(totalVal) / qty : 0;
              return (
                <tr key={r.id}>
                  <td>{r.issued_at}</td>
                  <td>#{r.item_id} — {r.item_code} / {r.item_name}</td>
                  <td style={{ color: "#c00", fontWeight: 600 }}>-{parseFloat(r.qty)}</td>
                  <td>{unitPrice ? `${unitPrice.toFixed(2)}` : "-"}</td>
                  <td style={{ fontWeight: 600, color: "#c00" }}>
                    {unitPrice ? `-SAR ${(qty * unitPrice).toFixed(2)}` : "-"}
                  </td>
                  <td>{r.Item_Stock ?? '-'}</td>
                  <td>{r.reason || "-"}</td>
                  <td>{r.po_number || r.order_id || "-"}</td>
                  <td>{r.supplier_id || "-"}</td>
                  <td>{r.issued_by || "-"}</td>
                  <td style={{ maxWidth: 200, overflowX: "auto", whiteSpace: "nowrap" }}>
                    <div style={{ maxWidth: 200, overflowX: "auto", whiteSpace: "nowrap" }}>
                      {r.note ?? "-"}
                    </div>
                  </td>                </tr>
              );
            })}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="11">No OUT movements</td>
              </tr>
            ) : (
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                <td colSpan="3">Total</td>
                <td>-{totalQty.toFixed(2)}</td>
                <td></td>
                <td style={{ color: '#c00' }}>-SAR {Math.abs(totalValue).toFixed(2)}</td>
                <td colSpan="6"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CombinedMovementsTable = ({ inRows, outRows }) => {
  // Combine and sort movements by date
  const combinedRows = useMemo(() => {
    const inMapped = inRows.map(r => ({
      ...r,
      type: 'in',
      date: r.received_at,
      amount: r.qty,
      value: (r.unit_cost || 0) * r.qty,
      by: r.received_by,
      details: r.po_number ? `PO: ${r.po_number}` : ''
    }));
    
    const outMapped = outRows.map(r => {
      const unitPrice = parseFloat(r.unit_price || 0);
      const qty = parseFloat(r.qty || 0);
      return {
        ...r,
        type: 'out',
        date: r.issued_at,
        amount: -qty,
        value: -(unitPrice * qty), // Calculate value for outbound items using unit_price
        unit_price: unitPrice,     // Include unit_price for reference
        by: r.issued_by,
        details: r.reason === 'order' && r.order_id ? `Order #${r.order_id}` : r.reason
      };
    });
    
    return [...inMapped, ...outMapped].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  }, [inRows, outRows]);

  // Calculate total value (IN - OUT)
  const totalValue = useMemo(() => {
    return combinedRows.reduce((sum, row) => sum + (row.value || 0), 0);
  }, [combinedRows]);

  // Calculate total IN and OUT values
  const { totalIn, totalOut } = useMemo(() => {
    return combinedRows.reduce((acc, row) => {
      if (row.type === 'in') {
        acc.totalIn += Math.abs(row.value) || 0;
      } else {
        acc.totalOut += Math.abs(row.value) || 0;
      }
      return acc;
    }, { totalIn: 0, totalOut: 0 });
  }, [combinedRows]);

  return (
    <div>
      <div style={{ overflowX: "auto", marginBottom: '20px' }}>
        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Date</th>
              <th>Item</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Value</th>
              <th>Stock</th>
              <th>Details</th>
              <th>By</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {combinedRows.map((row) => {
              const qtyAbs = Math.abs(parseFloat(row.amount || 0));
              const valAbs = Math.abs(parseFloat(row.value || 0));
              let unitPrice = qtyAbs ? valAbs / qtyAbs : 0;
              if (!unitPrice) {
                if (row.type === 'in') unitPrice = parseFloat(row.unit_cost || 0);
                if (row.type === 'out') unitPrice = parseFloat(row.unit_price || 0);
              }
              return (
                <tr key={`${row.type}-${row.id}`}>
                  <td>{row.date}</td>
                  <td>
                    #{row.item_id} — {row.item_code} / {row.item_name}
                  </td>
                  <td>{row.type.toUpperCase()}</td>
                  <td style={{ 
                    color: row.type === 'in' ? '#0a6' : '#c00', 
                    fontWeight: 600 
                  }}>
                    {row.type === 'in' ? '+' : '-'}{row.amount}
                  </td>
                  <td>{unitPrice ? `${unitPrice.toFixed(2)}` : '-'}</td>
                  <td>{row.value ? `SAR ${row.value.toFixed(2)}` : '-'}</td>
                  <td>{row.Item_Stock ?? '-'}</td>
                  <td>{row.details}</td>
                  <td>{row.by || '-'}</td>
                  <td style={{ maxWidth: 350, overflowX: "auto", whiteSpace: "nowrap" }}>
                    <div style={{ maxWidth: 350, overflowX: "auto", whiteSpace: "nowrap" }}>
                      {row.note ?? "-"}
                    </div>
                  </td> 
                </tr>
              );
            })}
            {combinedRows.length === 0 && (
              <tr>
                <td colSpan="10">No movements found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{
        margin: '16px 0',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        alignItems: 'center'
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: '#e8f5e9',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#2e7d32', marginBottom: '4px' }}>Total IN Value</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32' }}>
            SAR {totalIn.toFixed(2)}
          </div>
        </div>
        
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#c62828', marginBottom: '4px' }}>Total OUT Value</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c62828' }}>
            -SAR {totalOut.toFixed(2)}
          </div>
        </div>
        
        <div style={{
          padding: '12px',
          backgroundColor: totalValue >= 0 ? '#e8f5e9' : '#ffebee',
          borderRadius: '6px',
          textAlign: 'center',
          border: `2px solid ${totalValue >= 0 ? '#2e7d32' : '#c62828'}`
        }}>
          <div style={{ 
            fontSize: '14px', 
            color: totalValue >= 0 ? '#2e7d32' : '#c62828',
            marginBottom: '4px' 
          }}>
            Net Value
          </div>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: totalValue >= 0 ? '#2e7d32' : '#c62828' 
          }}>
            SAR {Math.abs(totalValue).toFixed(2)}
            <span style={{ 
              fontSize: '14px',
              marginLeft: '8px',
              fontWeight: 'normal'
            }}>
            {totalValue < 0 && "(Loss)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehousePage;
