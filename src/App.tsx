import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BudgetProvider, useBudget } from "@/lib/budget-context";
import { RecurringProvider } from "@/lib/recurring-context";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import Analytics from "./pages/Analytics";
import Recurring from "./pages/Recurring";
import Profile from "./pages/Profile";
import Expenses from "./pages/Expenses";
import YearlyInsights from "./pages/YearlyInsights";
import SavingsGoals from "./pages/SavingsGoals";
import OtherBudgets from "./pages/OtherBudgets";
import OtherBudgetDetail from "./pages/OtherBudgetDetail";
import Settings from "./pages/Settings";
import Lending from "./pages/Lending";
import AppLayout from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useBudget();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useBudget();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function TierRoute({ children }: { children: React.ReactNode }) {
  const { profile, profileLoaded } = useBudget();
  if (!profileLoaded) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (profile.tier !== 'pro') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BudgetProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route element={<ProtectedRoute><RecurringProvider><AppLayout /></RecurringProvider></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/yearly" element={<TierRoute><YearlyInsights /></TierRoute>} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/other-budgets" element={<TierRoute><OtherBudgets /></TierRoute>} />
              <Route path="/other-budgets/:id" element={<TierRoute><OtherBudgetDetail /></TierRoute>} />
              <Route path="/recurring" element={<TierRoute><Recurring /></TierRoute>} />
              <Route path="/savings-goals" element={<TierRoute><SavingsGoals /></TierRoute>} />
              <Route path="/lending" element={<TierRoute><Lending /></TierRoute>} />
              <Route path="/analytics" element={<TierRoute><Analytics /></TierRoute>} />
              <Route path="/expenses" element={<TierRoute><Expenses /></TierRoute>} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BudgetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
