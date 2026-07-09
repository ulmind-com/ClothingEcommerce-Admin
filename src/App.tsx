import { Navigate, Route, Routes } from "react-router-dom";
import { isAdmin } from "./auth";
import Layout from "./components/Layout";
import Banners from "./pages/Banners";
import Categories from "./pages/Categories";
import Coupons from "./pages/Coupons";
import Dashboard from "./pages/Dashboard";
import HomeLayout from "./pages/HomeLayout";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";
import Orders from "./pages/Orders";
import ProductEditor from "./pages/ProductEditor";
import Products from "./pages/Products";
import Refunds from "./pages/Refunds";
import Returns from "./pages/Returns";
import Reviews from "./pages/Reviews";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

function Guard({ children }: { children: React.ReactNode }) {
  return isAdmin() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductEditor />} />
        <Route path="/products/:id" element={<ProductEditor />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/banners" element={<Banners />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/users" element={<Users />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/home-layout" element={<HomeLayout />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
