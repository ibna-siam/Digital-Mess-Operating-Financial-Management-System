import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, BookOpen, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMobileMenu }) => {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink
        to="/"
        className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
      >
        <LayoutDashboard size={20} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/meals"
        className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
      >
        <UtensilsCrossed size={20} />
        <span>Meals</span>
      </NavLink>

      <NavLink
        to="/ledger"
        className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
      >
        <BookOpen size={20} />
        <span>Ledger</span>
      </NavLink>

      <button onClick={onOpenMobileMenu} className="mobile-nav-btn">
        <Menu size={20} />
        <span>More</span>
      </button>
    </nav>
  );
};
