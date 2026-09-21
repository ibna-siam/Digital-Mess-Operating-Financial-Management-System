import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ShoppingCart,
  Utensils,
  PlusCircle,
  Receipt,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface QuickActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (path: string) => {
    onClose();
    navigate(path);
  };

  const primaryActions = [
    {
      title: 'Record Bazar',
      desc: 'Log groceries, meat, fish & spices',
      icon: <ShoppingCart size={22} />,
      path: '/bazar',
      bgGradient: 'from-emerald-500 to-teal-600',
      shadowColor: 'rgba(16, 185, 129, 0.25)',
      badge: 'Popular',
    },
    {
      title: "Log Today's Meals",
      desc: '1-tap self entry or member meal counts',
      icon: <Utensils size={22} />,
      path: '/meals',
      bgGradient: 'from-sky-500 to-blue-600',
      shadowColor: 'rgba(14, 165, 233, 0.25)',
      badge: 'Daily',
    },
    {
      title: 'Add Other Expense',
      desc: 'Cook salary, cleaning, gas cylinder etc.',
      icon: <PlusCircle size={22} />,
      path: '/expenses',
      bgGradient: 'from-rose-500 to-pink-600',
      shadowColor: 'rgba(244, 63, 94, 0.25)',
      badge: null,
    },
    {
      title: 'Bills & Utilities',
      desc: 'House rent, internet Wi-Fi & electric bills',
      icon: <Receipt size={22} />,
      path: '/bills-utilities',
      bgGradient: 'from-indigo-500 to-purple-600',
      shadowColor: 'rgba(99, 102, 241, 0.25)',
      badge: null,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-8 duration-200"
        style={{
          boxShadow: '0 -20px 50px -10px rgba(15, 23, 42, 0.3)',
          paddingBottom: 'max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Indicator */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Quick Action</h2>
              <p className="text-[11px] text-slate-500 font-medium">What would you like to record?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {primaryActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleAction(action.path)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 active:scale-[0.98] transition-all text-left group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${action.bgGradient} text-white flex items-center justify-center shrink-0 shadow-md`}
                  style={{ boxShadow: `0 8px 16px -4px ${action.shadowColor}` }}
                >
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {action.title}
                    </span>
                    {action.badge && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{action.desc}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
                <ArrowRight size={15} />
              </div>
            </button>
          ))}

          {/* Secondary Quick Navigation Row */}
          <div className="pt-2 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleAction('/settlement')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 active:scale-[0.98] transition-transform text-xs font-bold"
            >
              <CheckCircle2 size={16} className="text-teal-600" />
              <span>Smart Settle</span>
            </button>
            <button
              onClick={() => handleAction('/ledger')}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 active:scale-[0.98] transition-transform text-xs font-bold"
            >
              <BookOpen size={16} className="text-indigo-600" />
              <span>Audit Ledger</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
