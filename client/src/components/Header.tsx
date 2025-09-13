import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "./LoginCard"; // adjust path if needed

const base = "hover:text-blue-600 transition-colors";
const navClass = ({ isActive }: { isActive: boolean }) =>
  `${base} ${isActive ? "text-blue-600" : ""}`;

export default function Header() {
  const { state, logout } = useAuth();

  return (
    <header className="w-full bg-white text-black shadow-md px-6 py-4 flex justify-between items-center">
      {/* Left: Logo */}
      <div className="flex items-center">
        <Link to="/" aria-label="Palonia Home">
          <img src="/images/logo.jpg" alt="Logo" className="h-16 w-auto" />
        </Link>
      </div>

      {/* Center: Nav Links */}
      <nav className="hidden md:flex space-x-6 text-sm font-medium">
        <NavLink to="/" end className={navClass}>
          Book
        </NavLink>
        <NavLink to="/destination-type" className={navClass}>
          Preferences
        </NavLink>
        <NavLink to="/promotions" className={navClass}>
          Offers
        </NavLink>
        <NavLink to="/credit-cards" className={navClass}>
          Credit Cards
        </NavLink>
        <NavLink to="/member" className={navClass}>
          Member
        </NavLink>
      </nav>

      {/* Right: Utility + Auth */}
      <div className="hidden md:flex space-x-4 text-sm items-center">
        <a href="#" className={base}>
          Help
        </a>
        <a href="#" className={base}>
          English
        </a>

        {state.status === "authenticated" ? (
          <button
            onClick={logout}
            className="text-sm font-medium hover:text-blue-600 transition-colors"
          >
            Sign Out
          </button>
        ) : (
          <Link
            to="/login"
            className="text-sm font-medium hover:text-blue-600 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}


