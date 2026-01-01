// // components/OrderListPage.jsx
// import React, { useEffect, useState } from "react";
// import "../styles/OrderListPage.css";

// const API_BASE = "https://arkanaltafawuq.com/arkan-system"; // no trailing slash
// const api = (p) => `${API_BASE}/${String(p).replace(/^\/+/, "")}`;

// const STATUS_FILTERS = [
//   "all",
//   "pending",
//   "brief uploaded",
//   "quotation uploaded",
//   "waiting for 3d",
//   "design phase",
//   "prova uploaded",
//   "approved",
//   "production files uploaded",
//   "images uploaded",
//   "invoice uploaded",
// ];

// const OrderListPage = ({ isSidebarOpen }) => {
//   const [orders, setOrders] = useState([]);
//   const [selectedStatus, setSelectedStatus] = useState("pending");
//   const [loading, setLoading] = useState(false);
//   const [showModal, setShowModal] = useState(false);
//   const [modalOrderId, setModalOrderId] = useState(null);
//   const [error, setError] = useState("");

//   // NEW: map of client_id -> client_name (from clients_vendors via existing endpoint)
//   const [clientsMap, setClientsMap] = useState({});

//   useEffect(() => {
//     fetchOrdersByStatus(selectedStatus);
//   }, [selectedStatus]);

//   // NEW: fetch clients once (this endpoint should already back your clients_vendors table)
//   useEffect(() => {
//     const fetchClients = async () => {
//       try {
//         // If you have a dedicated endpoint, you can also try: get_clients_vendors.php
//         const res = await fetch(api("get_clients.php"));
//         const data = await res.json();
//         if (data?.success && Array.isArray(data.clients)) {
//           const map = {};
//           for (const c of data.clients) {
//             const id = c.id != null ? String(c.id) : null;
//             if (!id) continue;
//             // prefer `name`, but fall back gracefully to common field names if needed
//             map[id] =
//               c.name ??
//               c.client_name ??
//               c.company_name ??
//               c.full_name ??
//               c.name_en ??
//               c.name_ar ??
//               `Client #${id}`;
//           }
//           setClientsMap(map);
//         } else {
//           setClientsMap({});
//         }
//       } catch {
//         setClientsMap({});
//       }
//     };
//     fetchClients();
//   }, []);

//   const fetchOrdersByStatus = async (status) => {
//     try {
//       setLoading(true);
//       setError("");
//       const url =
//         status && status !== "all"
//           ? api(`get_orders_by_status.php?status=${encodeURIComponent(status)}`)
//           : api("get_orders_by_status.php");

//       const res = await fetch(url);
//       const data = await res.json();
//       if (data.success) {
//         setOrders(Array.isArray(data.orders) ? data.orders : []);
//         if (!data.orders || data.orders.length === 0) {
//           setError("No orders found for this status.");
//         }
//       } else {
//         setOrders([]);
//         setError(data.message || "No orders found for this status.");
//       }
//     } catch (e) {
//       console.error(e);
//       setOrders([]);
//       setError("Failed to fetch orders.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleApproveProva = async (orderId) => {
//     try {
//       const res = await fetch(api("approve_prova.php"), {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           order_id: orderId,
//           approved_by: localStorage.getItem("username") || "system",
//         }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         alert("✅ Prova approved.");
//         fetchOrdersByStatus(selectedStatus);
//       } else {
//         setError(data.message || "Approve failed");
//       }
//     } catch (err) {
//       console.error(err);
//       setError("Request failed.");
//     }
//     setShowModal(false);
//   };

//   const handleFileUpload = async (orderId, file, field) => {
//     const formData = new FormData();
//     formData.append("order_id", orderId);
//     formData.append("field", field);
//     formData.append("file", file);
//     formData.append("assigned_to", localStorage.getItem("username") || "account_manager");

//     try {
//       const res = await fetch(api("upload_order_file.php"), {
//         method: "POST",
//         body: formData,
//       });
//       const data = await res.json();
//       if (data.success) {
//         alert(`✅ File uploaded. New status: ${data.new_status}`);
//         fetchOrdersByStatus(selectedStatus);
//       } else {
//         setError(data.message || "Upload failed");
//       }
//     } catch (err) {
//       console.error(err);
//       setError("Upload failed.");
//     }
//   };

//   const renderUploadInput = (order, fileKey, label) => (
//     <td className="table-cell">
//       <input
//         type="file"
//         onChange={(e) => {
//           if (e.target.files && e.target.files.length > 0) {
//             handleFileUpload(order.order_id, e.target.files[0], fileKey);
//           }
//         }}
//         className="form-input"
//         aria-label={`Upload ${label}`}
//       />
//       {order[fileKey] && (
//         <div className="file-link">
//           <a
//             href={`${API_BASE}/${order[fileKey]}`}
//             target="_blank"
//             rel="noreferrer"
//           >
//             <span className="field-icon"></span> View
//           </a>
//         </div>
//       )}
//     </td>
//   );

//   const prettyClientName = (order) => {
//     const id = order?.client_id != null ? String(order.client_id) : null;
//     // Prefer live map (from clients_vendors) ➜ fallback to order.client_name ➜ fallback to ID
//     return (id && clientsMap[id]) || order.client_name || id || "-";
//   };

//   return (
//     <div className={`order-page ${isSidebarOpen ? "shifted" : ""}`}>
//       <h2 className="order-title"> Order List</h2>

//       {error && <div className="error-message">❌ {error}</div>}

//       <div className="status-buttons">
//         {STATUS_FILTERS.map((status) => (
//           <button
//             key={status}
//             onClick={() => setSelectedStatus(status)}
//             className={`status-button ${selectedStatus === status ? "active" : ""}`}
//             title={`Filter by ${status}`}
//           >
//             {status}
//           </button>
//         ))}
//         <button
//           onClick={() => fetchOrdersByStatus(selectedStatus)}
//           className="form-button refresh-button"
//         >
//           <span className="button-icon">🔄</span> Refresh
//         </button>
//       </div>

//       {loading ? (
//         <div className="loading">
//           <span className="spinner"></span> Loading...
//         </div>
//       ) : orders.length === 0 ? (
//         <p className="no-orders">No orders found for this status.</p>
//       ) : (
//         <div className="table-container">
//           <table className="order-table">
//             <thead>
//               <tr>
//                 <th>ID</th>
//                 <th>Client</th>
//                 <th>Status</th>
//                 <th>Brief</th>
//                 <th>3D</th>
//                 <th>Prova</th>
//                 <th>Production</th>
//                 <th>Images</th>
//                 <th>Invoice</th>
//                 <th>Created By</th>
//                 <th>Created At</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((order) => (
//                 <tr key={order.order_id}>
//                   <td className="table-cell">{order.order_id}</td>
//                   <td className="table-cell">{prettyClientName(order)}</td>
//                   <td className="table-cell">{order.status}</td>

//                   {renderUploadInput(order, "brief_file", "brief")}
//                   {renderUploadInput(order, "d3_file", "3D")}
//                   {renderUploadInput(order, "prova_file", "prova")}
//                   {renderUploadInput(order, "production_file", "production")}
//                   {renderUploadInput(order, "final_images", "images")}
//                   {renderUploadInput(order, "invoice_file", "invoice")}

//                   <td className="table-cell">{order.created_by}</td>
//                   <td className="table-cell">{order.created_at}</td>
//                   <td className="table-cell">
//                     {order.status === "prova uploaded" && (
//                       <button
//                         onClick={() => {
//                           setModalOrderId(order.order_id);
//                           setShowModal(true);
//                         }}
//                         className="form-button approve-button"
//                       >
//                         <span className="button-icon">✅</span> Approve Prova
//                       </button>
//                     )}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {showModal && (
//         <div className="modal" role="dialog" aria-modal="true">
//           <div className="modal-content">
//             <h3 className="modal-title">Confirm Prova Approval</h3>
//             <p>Are you sure you want to approve the prova for order {modalOrderId}?</p>
//             <div className="modal-buttons">
//               <button
//                 onClick={() => handleApproveProva(modalOrderId)}
//                 className="form-button submit-button"
//               >
//                 <span className="button-icon">✔️</span> Confirm
//               </button>
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="form-button cancel-button"
//               >
//                 <span className="button-icon">✖️</span> Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OrderListPage;
