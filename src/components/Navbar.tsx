import { Search, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import logo from "/central-celulares-logo.png";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      {/* Top bar like old site */}
      <div className="top-bar">
        <p>Bienvenidos a Central Celulares</p>
      </div>

      {/* Main header */}
      <div className="header">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="logo-box">
            <img
              src={logo}
              alt="Central Celulares"
              className="logo-image"
            />
          </Link>

          {/* Gray bar containing nav + search, like old header-right area */}
          <div className="header-right hidden md:flex">
            {/* Navigation items (center) */}
            <nav className="nav-menu flex items-center gap-8 text-sm font-medium">
              <Link to="/" className="nav-link">
                Inicio
              </Link>
              <Link to="/catalog" className="nav-link">
                Productos
              </Link>
              <Link to="/services" className="nav-link">
                Servicios
              </Link>
              <Link to="/about" className="nav-link">
                Nosotros
              </Link>
            </nav>

            {/* Search on the right, matching old header-actions */}
            <div className="header-actions">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="search-button" type="button">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white px-4"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {isOpen && (
          <div className="md:hidden bg-[#3A3A3A] py-3 border-t border-white/10">
            <div className="flex flex-col gap-2 px-4">
              <Link to="/" className="text-gray-200 hover:text-white">
                Inicio
              </Link>
              <Link to="/catalog" className="text-gray-200 hover:text-white">
                Productos
              </Link>
              <Link to="/services" className="text-gray-200 hover:text-white">
                Servicios
              </Link>
              <Link to="/about" className="text-gray-200 hover:text-white">
                Nosotros
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
