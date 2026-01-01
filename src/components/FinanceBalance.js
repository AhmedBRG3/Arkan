import React, { useEffect, useState, useCallback } from "react";
import ClientsPage from "./ClientsPage";

/* =========================
   API base helper (CRA + Vite safe)
   ========================= */
// ===== API base (hard-set to your backend) =====
const API_BASE = "https://arkanaltafawuq.com/arkan-system"; // ← no trailing slash

const joinUrl = (base, path) => {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return b && p ? `${b}/${p}` : (b || p);
};

const API = (path) => {
  const url = joinUrl(API_BASE, path);
  // quick guard for Safari "string did not match the expected pattern"
  if (!/^https?:\/\/[^ ]+$/i.test(url)) {
    console.error("Bad API URL:", url);
    throw new Error("Bad API URL");
  }
  return url;
};

/* =========================
   Small UI bits
   ========================= */
const Card = ({ title, value, gradient }) => {
  const gradients = gradient || ["#3b82f6", "#2563eb"];
  return (
    <div style={{
      background: `linear-gradient(135deg, ${gradients[0]} 0%, ${gradients[1]} 100%)`,
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 4px 14px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
      color: "#ffffff",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        opacity: 0.9,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>{title}</div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>{(Number(value || 0) >= 0 ? "+" : "") + Number(value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
      <div style={{
        position: "absolute",
        top: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        pointerEvents: "none"
      }} />
    </div>
  );
};

/* =========================
   Main component
   ========================= */
export default function FinancePage() {
  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    category_id: "",
    account: "",
    direction: "",
    kind: ""
  });

  const [form, setForm] = useState({
    txn_date: new Date().toISOString().slice(0,10),
    category_id: "",
    account: "bank",     // bank | cash
    direction: "out",    // in | out
    amount: "",
    note: "",
    user: (() => {
      try {
        const u = JSON.parse(localStorage.getItem("loggedUser") || "{}");
        return u?.username || "finance";
      } catch { return "finance"; }
    })()
  });

  // Parties (clients/vendors) for linking transactions to a party
  const [partyType, setPartyType] = useState("client"); // client | vendor
  const [partyId, setPartyId] = useState("");
  const [allParties, setAllParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingParties(true);
        const res = await fetch(API("get_clients.php"));
        const j = await res.json();
        const clean = (j.clients || [])
          .filter((c) => ["Client", "Vendor", "client", "vendor"].includes(c.type))
          .map((c) => ({
            ...c,
            id: Number(c.id),
            balance: parseFloat(c.balance) || 0,
            typeNorm: String(c.type).toLowerCase(),
          }));
        if (!cancelled) {
          setAllParties(clean);
          // reset selection if current is not in filtered group
          if (!clean.some((p) => String(p.id) === String(partyId) && p.typeNorm === partyType)) {
            setPartyId("");
          }
        }
      } catch {
        if (!cancelled) {
          setAllParties([]);
        }
      } finally {
        if (!cancelled) setLoadingParties(false);
      }
    })();
    return () => { setLoadingParties(false); cancelled = true; };
  }, [partyType]);

  const parties = React.useMemo(
    () => allParties
      .filter((p) => p.typeNorm === partyType)
      .sort((a,b) => String(a.name).localeCompare(String(b.name))),
    [allParties, partyType]
  );

  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setError("");
      const res = await fetch(API("finance_get_summary.php"), { headers:{ "Content-Type":"application/json" }});
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to load summary");
      setSummary(data);
    } catch (e) {
      setError(`Summary error: ${e.message}`);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const calculateRunningBalances = (transactions) => {
    let cashBalance = 0;
    let bankBalance = 0;
    
    // Calculate running balances from oldest to newest
    return transactions
      .slice() // Create a copy to avoid mutating the original array
      .sort((a, b) => new Date(a.txn_date) - new Date(b.txn_date) || a.id - b.id)
      .map(txn => {
        // Calculate the effect of this transaction on balances
        const amount = parseFloat(txn.amount) * (txn.direction === 'in' ? 1 : -1);
        
        if (txn.account.toLowerCase() === 'cash') {
          cashBalance += amount;
        } else if (txn.account.toLowerCase() === 'bank') {
          bankBalance += amount;
        }
        
        // Return the transaction with calculated balances
        return {
          ...txn,
          cash_balance_after: txn.account.toLowerCase() === 'cash' ? cashBalance : null,
          bank_balance_after: txn.account.toLowerCase() === 'bank' ? bankBalance : null
        };
      })
      .reverse(); // Show newest first
  };

  const loadTxns = async () => {
    try {
      setLoadingTxns(true);
      setError("");
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_,v]) => v !== "" && v !== null))
      ).toString();
      const res = await fetch(API(`finance_get_transactions.php${qs ? `?${qs}` : ""}`), { headers:{"Content-Type":"application/json" }});
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to load transactions");
      
      // Calculate running balances and update transactions
      const transactionsWithBalances = calculateRunningBalances(data.transactions);
      setTxns(transactionsWithBalances);
    } catch (e) {
      setError(`Transactions error: ${e.message}`);
    } finally {
      setLoadingTxns(false);
    }
  };

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadTxns(); }, [filters]);

  const submitTxn = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        ...form,
        amount: parseFloat(form.amount || "0")
      };
      if (!payload.category_id) throw new Error("Please select a category");
      if (!payload.amount || payload.amount <= 0) throw new Error("Amount must be greater than 0");
      if (!["bank","cash"].includes(payload.account)) throw new Error("Account must be Bank or Cash");
      if (!["in","out"].includes(payload.direction)) throw new Error("Direction must be In or Out");

      // Attach selected party (optional)
      if (partyId) {
        payload.party_type = partyType;   // client | vendor
        payload.party_id = Number(partyId);
      }

      const res = await fetch(API("finance_add_transaction.php"), {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || "Failed to add transaction");

      // refresh
      setForm(f => ({ ...f, amount:"", note:"" }));
      await loadSummary();
      await loadTxns();
      alert("Transaction added");
    } catch (e2) {
      setError(`Add transaction error: ${e2.message}`);
    }
  };

  const categories = summary?.categories ?? [];
  const bank = summary?.balances?.bank ?? 0;
  const cash = summary?.balances?.cash ?? 0;
  const wh   = summary?.warehouse?.total_value ?? 0;

  const totalIn  = summary?.totals?.in_all_time ?? 0;
  const totalOut = summary?.totals?.out_all_time ?? 0;

  // Totals for the visible table (respect current Account filter)
  const tableTotals = React.useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    const wantedAccount = String(filters.account || "").toLowerCase();
    for (const t of txns) {
      const acc = String(t.account || "").toLowerCase();
      if (wantedAccount && acc !== wantedAccount) continue; // extra guard (API already filters)
      const amt = Number(t.amount) || 0;
      const dir = String(t.direction || "").toLowerCase();
      if (dir === "in") inSum += amt; else if (dir === "out") outSum += amt;
    }
    return { inSum, outSum };
  }, [txns, filters.account]);

  const cardStyle = { background: "#fff", border: "1px solid #e6e6f0", borderRadius: 12, padding: 20, boxShadow: "0 4px 14px rgba(16,24,40,0.08)", marginBottom: 24 };
  const sectionTitleStyle = { margin: "0 0 20px 0", fontSize: 20, fontWeight: 700, color: "#1f2937" };
  const inputStyle = { borderRadius: 10, padding: "10px 12px", border: "1px solid #e5e7eb", fontSize: 14, width: "100%", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };

  return (
    <div style={{padding:"32px", maxWidth:1400, margin:"0 auto", background: "#f9fafb", minHeight: "100vh"}}>
      <div style={{marginBottom: 32}}>
        <h1 style={{
          marginBottom: 8,
          fontSize: 32,
          fontWeight: 700,
          color: "#1f2937",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span style={{fontSize: 36}}>💰</span>
          Finance Dashboard
        </h1>
        <p style={{color: "#6b7280", fontSize: 14, margin: 0}}>Manage transactions, balances, and financial records</p>
      </div>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "#dc2626",
          padding: "14px 18px",
          borderRadius: 12,
          marginBottom: 24,
          fontWeight: 600,
          fontSize: 14
        }}>
          ❌ {error}
        </div>
      )}

      {/* Balances */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:20, marginBottom:32}}>
        <Card title="Bank Balance" value={bank} gradient={["#475569", "#334155"]} />
        <Card title="Cash Balance" value={cash} gradient={["#64748b", "#475569"]} />
        <Card title="Total In (All time)" value={totalIn} gradient={["#0f766e", "#115e59"]} />
        <Card title="Total Out (All time)" value={totalOut} gradient={["#b45309", "#92400e"]} />
      </div>

      {/* Warehouse & Receipts */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:20, marginBottom:32}}>
        <Card title="Warehouse Total Value" value={wh} gradient={["#1e40af", "#1e3a8a"]} />
        <Card title="Receipts In" value={summary?.receipts?.in ?? 0} gradient={["#065f46", "#047857"]} />
        <Card title="Receipts Out" value={summary?.receipts?.out ?? 0} gradient={["#991b1b", "#7f1d1d"]} />
      </div>

      {/* Add Transaction */}
      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>➕ Add Transaction</h2>
        <form onSubmit={submitTxn} style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, alignItems:"end"}}>
          <div>
            <label style={labelStyle}>Date</label>
            <input 
              type="date" 
              value={form.txn_date} 
              onChange={e=>setForm({...form, txn_date:e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select 
              value={form.category_id} 
              onChange={e=>setForm({...form, category_id:e.target.value})}
              style={inputStyle}
            >
              <option value="">Select...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Direction</label>
            <select 
              value={form.direction} 
              onChange={e=>setForm({...form, direction:e.target.value})}
              style={inputStyle}
            >
              <option value="out">Out (Expense)</option>
              <option value="in">In (Income)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Account</label>
            <select 
              value={form.account} 
              onChange={e=>setForm({...form, account:e.target.value})}
              style={inputStyle}
            >
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount</label>
            <input 
              type="number" 
              step="0.01" 
              value={form.amount} 
              onChange={e=>setForm({...form, amount:e.target.value})}
              style={inputStyle}
              placeholder="0.00"
            />
          </div>
          <div style={{gridColumn:"span 2"}}>
            <label style={labelStyle}>Note</label>
            <input 
              type="text" 
              value={form.note} 
              onChange={e=>setForm({...form, note:e.target.value})}
              style={inputStyle}
              placeholder="Transaction note..."
            />
          </div>
          <div>
            <label style={labelStyle}>Party Type</label>
            <select 
              value={partyType} 
              onChange={e=>setPartyType(e.target.value)}
              style={inputStyle}
            >
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Party {loadingParties && <span style={{color:'#9ca3af', fontSize: 11}}>loading…</span>}
            </label>
            <select 
              value={partyId} 
              onChange={e=>setPartyId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Select --</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — Bal: {(Number(p.balance)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button 
              type="submit"
              style={{
                background: "linear-gradient(90deg, #475569 0%, #334155 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 24px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(71,85,105,0.2)",
                transition: "all 0.2s",
                width: "100%"
              }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              ➕ Add Transaction
            </button>
          </div>
        </form>
      </section>

      {/* Filters */}
      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>📊 Transactions</h2>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:16, marginBottom: 16}}>
          <div>
            <label style={labelStyle}>From Date</label>
            <input 
              type="date" 
              value={filters.from} 
              onChange={e=>setFilters({...filters, from:e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>To Date</label>
            <input 
              type="date" 
              value={filters.to} 
              onChange={e=>setFilters({...filters, to:e.target.value})}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select 
              value={filters.category_id} 
              onChange={e=>setFilters({...filters, category_id:e.target.value})}
              style={inputStyle}
            >
              <option value="">All</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Kind</label>
            <select 
              value={filters.kind} 
              onChange={e=>setFilters({...filters, kind:e.target.value})}
              style={inputStyle}
            >
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Account</label>
            <select 
              value={filters.account} 
              onChange={e=>setFilters({...filters, account:e.target.value})}
              style={inputStyle}
            >
              <option value="">All</option>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Direction</label>
            <select 
              value={filters.direction} 
              onChange={e=>setFilters({...filters, direction:e.target.value})}
              style={inputStyle}
            >
              <option value="">All</option>
              <option value="in">In</option>
              <option value="out">Out</option>
            </select>
          </div>
        </div>
        <div style={{display:"flex", gap:12}}>
          <button 
            onClick={()=>setFilters({from:"",to:"",category_id:"",account:"",direction:"",kind:""})}
            style={{
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "10px 20px",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              color: "#374151",
              transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"}
            onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}
          >
            🔄 Reset
          </button>
          <button 
            onClick={loadTxns}
            style={{
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
            }}
            onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            🔃 Refresh
          </button>
        </div>
      </section>

      {/* Table */}
      <div style={cardStyle}>
        <div style={{overflowX:"auto"}}>
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
                <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Date</th>
                <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Category</th>
                <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Kind</th>
                <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Account</th>
                <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Direction</th>
                <th style={{padding: "14px 12px", textAlign: "right", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Amount</th>
                <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Note</th>
                <th style={{padding: "14px 12px", textAlign: "left", fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>By</th>
                <th style={{padding: "14px 12px", textAlign:'right', fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Cash After</th>
                <th style={{padding: "14px 12px", textAlign:'right', fontWeight: 700, fontSize: 13, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px"}}>Bank After</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t, idx) => (
                <tr 
                  key={t.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: idx % 2 === 0 ? "#fff" : "#fafafa",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafafa"}
                >
                  <td style={{padding: "12px", fontSize: 14, color: "#1f2937"}}>{t.txn_date}</td>
                  <td style={{padding: "12px", fontSize: 14, color: "#1f2937"}}>{t.category}</td>
                  <td style={{padding: "12px"}}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: t.kind === "income" ? "rgba(5,150,105,0.1)" : "rgba(153,27,27,0.1)",
                      color: t.kind === "income" ? "#047857" : "#991b1b"
                    }}>{t.kind}</span>
                  </td>
                  <td style={{padding: "12px", fontSize: 14, color: "#1f2937", textTransform: "capitalize"}}>{t.account}</td>
                  <td style={{padding: "12px"}}>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      background: t.direction === "in" ? "rgba(5,150,105,0.1)" : "rgba(153,27,27,0.1)",
                      color: t.direction === "in" ? "#047857" : "#991b1b"
                    }}>{t.direction === "in" ? "↑ In" : "↓ Out"}</span>
                  </td>
                  <td style={{padding: "12px", textAlign:'right', fontSize: 15, fontWeight: 600, color: t.direction === "in" ? "#047857" : "#991b1b", fontFamily: "monospace"}}>
                    {t.direction === "in" ? "+" : "-"}{Number(t.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td style={{padding: "12px", maxWidth: 200, fontSize: 14, color: "#6b7280"}}>
                    <div style={{ maxWidth: 200, overflowX: "auto", whiteSpace: "nowrap" }}>
                      {t.note || "—"}
                    </div>
                  </td>
                  <td style={{padding: "12px", fontSize: 14, color: "#6b7280"}}>{t.created_by || "—"}</td>
                  <td style={{padding: "12px", textAlign:'right', fontFamily: 'monospace', fontSize: 14, fontWeight: 500, color: "#1f2937"}}>
                    {t.cash_balance_after == null ? '—' : Number(t.cash_balance_after).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td style={{padding: "12px", textAlign:'right', fontFamily: 'monospace', fontSize: 14, fontWeight: 500, color: "#1f2937"}}>
                    {t.bank_balance_after == null ? '—' : Number(t.bank_balance_after).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                </tr>
              ))}
              {(!loadingTxns && txns.length===0) && (
                <tr>
                  <td colSpan="10" style={{textAlign:"center", padding:"48px", color: "#9ca3af", fontSize: 14}}>
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ 
                background: "linear-gradient(90deg, #f9fafb 0%, #f3f4f6 100%)",
                borderTop: "2px solid #e5e7eb",
                fontWeight: 700 
              }}>
                <td colSpan="5" style={{padding: "16px 12px", fontSize: 14, color: "#1f2937"}}>
                  Totals {filters.account ? `(${filters.account})` : "(All accounts)"}
                </td>
                <td colSpan="1" style={{padding: "16px 12px", textAlign: "right", fontSize: 15, color: "#1f2937"}}>
                  <span style={{color: "#047857"}}>+{tableTotals.inSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {" / "}
                  <span style={{color: "#991b1b"}}>-{tableTotals.outSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </td>
                <td colSpan="4" style={{padding: "16px 12px"}}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Clients & Vendors Balance Editor */}
      <ClientsPage onUpdate={loadSummary} API={API} />

      {/* Backend diagnostics (from PHP file) */}
      {summary?.diagnostics?.length > 0 && (
        <div style={{marginTop:16, fontSize:12, color:"#666"}}>
          <strong>Diagnostics:</strong>
          <ul>
            {summary.diagnostics.map((d,i)=><li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
