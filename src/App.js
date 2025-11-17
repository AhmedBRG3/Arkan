// App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ClientsPage from "./components/ClientsPage";
import OrdersPage from "./components/OrdersPage";
import FinancePage from "./components/FinancePage";
import PurchaseReceiptPage from "./components/PurchaseReceiptPage";
import CreateOrderPage from "./components/CreateOrderPage";
import OrderListPage from "./components/OrderListPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import DesignerManagerPage from "./components/DesignerManagerPage";
import DesignerTeamPage from "./components/DesignerTeamPage";
import DesignerManagerAcceptancePage from "./components/DesignerManagerAcceptancePage";
import WarehousePage from "./components/WarehousePage";
import FinanceBalance from "./components/FinanceBalance";
import AllReceiptsPage from "./components/AllReceiptsPage"; 
import UsersPage from "./components/UsersPage";
import SessionTest from "./components/SessionTest";
import ExcelImportPage from "./components/ExcelImportPage";
import ProductionPage from "./components/ProductionPage";
import ProjectEditPage from "./components/ProjectEditPage";
import AccountmanagerPage from "./components/AccountmanagerPage";
const LayoutWithSidebar = ({ children }) => {
  const location = useLocation();
  const showSidebar = location.pathname !== "/Login";
  const role = localStorage.getItem("role") || ""; // <-- pass role from localStorage

  return (
    <div style={{ display: "flex" }}>
      {showSidebar && <Sidebar role={role} />}
      <div style={{ flex: 1, padding: "20px" }}>{children}</div>
    </div>
  );
};

function App() {
  return (
    <Router basename="/arkann">
      <LayoutWithSidebar>
        <Routes>
          <Route path="/" element={<Navigate to="/Login" />} />
          <Route path="/Login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <ClientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/production"
            element={
              <ProtectedRoute>
                <ProductionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-manager"
            element={
              <ProtectedRoute>
                <AccountmanagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:id/edit"
            element={
              <ProtectedRoute>
                <ProjectEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <FinancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/all-receipts"
            element={
              <ProtectedRoute>
                <AllReceiptsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-order"
            element={
              <ProtectedRoute>
                <CreateOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-list"
            element={
              <ProtectedRoute>
                <OrderListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session-test"
            element={
              <ProtectedRoute>
                <SessionTest />
              </ProtectedRoute>
            }
          />

          {/* Designer Manager */}
          <Route
            path="/designer-manager"
            element={
              <ProtectedRoute>
                <DesignerManagerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/designer-manager-approval"
            element={
              <ProtectedRoute>
                <DesignerManagerAcceptancePage />
              </ProtectedRoute>
            }
          />

          {/* Designer Team */}
          <Route
            path="/designer-team"
            element={
              <ProtectedRoute>
                <DesignerTeamPage />
              </ProtectedRoute>
            }
          />
          
          <Route
  path="/warehouse"
  element={
    <ProtectedRoute>
      <WarehousePage />
    </ProtectedRoute>
  }
/>

  <Route
  path="/financebalance"
  element={
    <ProtectedRoute>
      <FinanceBalance />
    </ProtectedRoute>
  }
/>
 <Route
            path="/manage-users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/excel-import"
            element={
              <ProtectedRoute>
                <ExcelImportPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </LayoutWithSidebar>
    </Router>
  );
}

export default App;
