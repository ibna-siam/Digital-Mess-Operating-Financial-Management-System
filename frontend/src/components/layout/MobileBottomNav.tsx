import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Plus, BookOpen, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void;
  onOpenQuickAction?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenMobileMenu,
  onOpenQuickAction,
}) => {
  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))',
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* 1. Home */}
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `mobile-nav-btn flex-1 ${isActive ? 'active text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-emerald-50 text-emerald-600 shadow-xs' : 'text-slate-400'
              }`}
            >
              <LayoutDashboard size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span className="text-[10px] tracking-tight">Home</span>
          </>
        )}
      </NavLink>

      {/* 2. Meals */}
      <NavLink
        to="/meals"
        className={({ isActive }) =>
          `mobile-nav-btn flex-1 ${isActive ? 'active text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-emerald-50 text-emerald-600 shadow-xs' : 'text-slate-400'
              }`}
            >
              <UtensilsCrossed size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span className="text-[10px] tracking-tight">Meals</span>
          </>
        )}
      </NavLink>

      {/* 3. Center Elevated Quick Action FAB */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-5">
        <button
          onClick={onOpenQuickAction}
          className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-2 border-white active:scale-90 transition-transform cursor-pointer"
          aria-label="Quick Action: Log Bazar, Meals, or Expense"
        >
          <Plus size={26} strokeWidth={2.6} />
        </button>
        <span className="text-[10px] font-bold text-emerald-700 tracking-tight mt-0.5">Quick Log</span>
      </div>

      {/* 4. Ledger */}
      <NavLink
        to="/ledger"
        className={({ isActive }) =>
          `mobile-nav-btn flex-1 ${isActive ? 'active text-emerald-600 font-bold' : 'text-slate-400 font-medium'}`
        }
      >
        {({ isActive }) => (
          <>
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-emerald-50 text-emerald-600 shadow-xs' : 'text-slate-400'
              }`}
            >
              <BookOpen size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            </div>
            <span className="text-[10px] tracking-tight">Ledger</span>
          </>
        )}
      </NavLink>

      {/* 5. More Hub */}
      <button
        onClick={onOpenMobileMenu}
        className="mobile-nav-btn flex-1 text-slate-400 font-medium hover:text-slate-600"
        aria-label="Open More Menu"
      >
        <div className="p-1.5 rounded-xl text-slate-400">
          <Menu size={20} strokeWidth={1.8} />
        </div>
        <span className="text-[10px] tracking-tight">More</span>
      </button>
    </nav>
  );
};
