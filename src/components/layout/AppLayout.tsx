import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, ArrowUpDown, BarChart3, User, LogOut, Menu, X, Moon, Sun, Repeat, Trophy, Target } from 'lucide-react';
import { useBudget } from '@/lib/budget-context';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/yearly', label: 'Yearly Insights', icon: Trophy },
  { to: '/budget', label: 'Budget', icon: ArrowUpDown },
  { to: '/recurring', label: 'Recurring', icon: Repeat },
  { to: '/savings-goals', label: 'Savings Goals', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function AppLayout() {
  const { signOut, profile, isDark, toggleDark } = useBudget();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-2.5 p-5">
          <img src="/icon-192.png" alt="Budget Bro" className="w-9 h-9 rounded-xl shadow-sm" />
          <span className="font-display font-bold text-lg text-sidebar-foreground">Budget Bro</span>
          <button className="ml-auto lg:hidden text-sidebar-muted hover:text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button onClick={toggleDark} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent">
            <div className="w-10 h-10 rounded-full bg-hero-gradient flex items-center justify-center text-lg shadow-sm">
              {profile.avatar || '💼'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{profile.username || 'User'}</p>
              <p className="text-xs text-sidebar-muted truncate">{profile.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border lg:hidden">
          <div className="flex items-center h-14 px-4">
            <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 ml-3">
              <img src="/icon-192.png" alt="Budget Bro" className="w-7 h-7 rounded-lg" />
              <span className="font-display font-bold text-foreground">Budget Bro</span>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
