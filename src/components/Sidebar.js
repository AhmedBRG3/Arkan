// components/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import {
  Users,
  FileText,
  Package,
  DollarSign,
  Palette,
  Check,
  Pencil,
  LogOut,
  ClipboardList,
  ShoppingCart,
  DollarSignIcon,
  BadgeDollarSign,
  Upload,
  Factory,
} from "lucide-react";

const Sidebar = ({ role: roleProp }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  // Get role from props or localStorage
  const role = roleProp || localStorage.getItem("role") || "";

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  const toggleSidebar = () => setIsOpen((v) => !v);

  useEffect(() => {
    if (isOpen) setIsHovered(true);
  }, [isOpen]);

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const menuItems = {
    admin: [
      { to: "/manage-users", label: "Manage Users", icon: <Users size={18} /> },
      { to: "/clients", label: "Clients/Vendors", icon: <FileText size={18} /> },
      { to: "/warehouse", label: "Warehouse", icon: <Package size={18} /> },
      { to: "/finance", label: "Finance", icon: <BadgeDollarSign size={18} /> },
      { to: "/all-receipts", label: "All Receipts", icon: <ClipboardList size={18} /> },
      { to: "/financebalance", label: "Balance", icon: <DollarSignIcon size={18} /> },
      { to: "/excel-import", label: "CSV Import", icon: <Upload size={18} /> },
      { to: "/designer-team", label: "Designer Team", icon: <Pencil size={18} /> },
      { to: "/production", label: "Production", icon: <ClipboardList size={18} /> },
      { to: "/designer-manager", label: "Designer Manager", icon: <Palette size={18} /> },
      { to: "/create-order", label: "Create Orders", icon: <ShoppingCart size={18} /> },
      { to: "/order-list", label: "Order List", icon: <ClipboardList size={18} /> },
      // { to: "/production", label: "Production", icon: <Factory size={18} /> },
    ],
    "account manager": [
      { to: "/create-order", label: "Create Orders", icon: <ShoppingCart size={18} /> },
      { to: "/production", label: "Production", icon: <ClipboardList size={18} /> },

    ],
    "designer manager": [
      { to: "/designer-manager", label: "Designer Manager", icon: <Palette size={18} /> },
      
    ],
    designer: [
      { to: "/designer-team", label: "Designer Team", icon: <Pencil size={18} /> },
    ],
    finance: [
      { to: "/finance", label: "Finance", icon: <BadgeDollarSign size={18} /> },
      { to: "/all-receipts", label: "All Receipts", icon: <ClipboardList size={18} /> },
      { to: "/warehouse", label: "Warehouse", icon: <Package size={18} /> },
      { to: "/financebalance", label: "Balance", icon: <DollarSignIcon size={18} /> },
      { to: "/excel-import", label: "CSV Import", icon: <Upload size={18} /> },


    ],
    production: [
      { to: "/production", label: "Production"},
      { to: "/order-list", label: "Order List", icon: <ClipboardList size={18} /> },
      { to: "/create-order", label: "Create Orders", icon: <ShoppingCart size={18} /> },


    ],
  };

  const items = menuItems[role] || [];

  return (
    <>
      <div
        className="sidebar-hover-area"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`sidebar ${isHovered || isOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo-title" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <img src={require("../assests/arkansmall.svg").default || require("../assests/arkansmall.svg")} alt="Erkan Logo" style={{ height: 32, width: "auto" }} />
              <h3 className="sidebar-title" style={{ margin: 0 }}>Menu</h3>
            </div>
            <button onClick={toggleSidebar} className="toggle-button">
              <svg
                className="toggle-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}
                />
              </svg>
            </button>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: "10px", color: "#999" }}>
              No menu for role: <strong>{role || "unknown"}</strong>
            </div>
          ) : (
            <ul className="sidebar-menu">
              {items.map((item, index) => (
                <li key={index}>
                  <Link to={item.to} className="menu-item">
                    <span className="menu-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Logout Button */}
          <div className="sidebar-footer">
            <button onClick={handleLogout} className="menu-item logout-button">
              <LogOut size={18} className="menu-icon" />
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className={`main-content ${isHovered || isOpen ? "shifted" : ""}`} />
    </>
  );
};

export default Sidebar;
