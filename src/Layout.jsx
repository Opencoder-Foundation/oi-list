import { NavLink, Outlet } from "react-router-dom";
import UserWidget from "./UserWidget";
import "./Layout.css";

export const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <NavLink
          to="/"
          className="nav-link"
          style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal" })}
        >
          Lista
        </NavLink>

        <NavLink
          to="/faq"
          className="nav-link"
          style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal"   })}
        >
          FAQ
        </NavLink>
      </div>

      <UserWidget />
    </nav>
  );
};

const Layout = () => {
  return (
    <div>
      <Navbar />
      <main style={{ padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;