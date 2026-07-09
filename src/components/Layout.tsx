import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/products", label: "Products" },
  { to: "/categories", label: "Categories" },
  { to: "/banners", label: "Banners / Offers" },
  { to: "/home-layout", label: "Home Layout" },
  { to: "/coupons", label: "Coupons" },
  { to: "/notifications", label: "Notifications" },
  { to: "/orders", label: "Orders" },
  { to: "/users", label: "Users" },
  { to: "/refunds", label: "Refunds" },
  { to: "/returns", label: "Returns" },
  { to: "/reviews", label: "Reviews" },
  { to: "/settings", label: "Settings" },
];

export default function Layout() {
  const nav = useNavigate();
  const user = getUser();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Clothing<span>.</span>Admin</div>
        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <div className="topbar">
          <div />
          <div className="flex">
            <span className="muted">{user?.email}</span>
            <button
              className="logout"
              onClick={() => {
                logout();
                nav("/login");
              }}
            >
              Log out
            </button>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
