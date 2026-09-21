import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, BookOpen, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMobileMenu }) => {
  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(62px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `mobile-nav-btn ${isActive ? 'active text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={`p-1 rounded-xl transition-colors ${
                isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'
              }`}
            >
              <LayoutDashboard size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] tracking-tight">Home</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/meals"
        className={({ isActive }) =>
          `mobile-nav-btn ${isActive ? 'active text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={`p-1 rounded-xl transition-colors ${
                isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'
              }`}
            >
              <UtensilsCrossed size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] tracking-tight">Meals</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/ledger"
        className={({ isActive }) =>
          `mobile-nav-btn ${isActive ? 'active text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={`p-1 rounded-xl transition-colors ${
                isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'
              }`}
            >
              <BookOpen size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[10px] tracking-tight">Ledger</span>
          </>
        )}
      </NavLink>

      <button
        onClick={onOpenMobileMenu}
        className="mobile-nav-btn text-slate-400 font-medium hover:text-slate-600 active:scale-95 transition-transform"
      >
        <div className="p-1 rounded-xl text-slate-400">
          <Menu size={20} strokeWidth={2} />
        </div>
        <span className="text-[10px] tracking-tight">More</span>
      </button>
    </nav>
  );
};
