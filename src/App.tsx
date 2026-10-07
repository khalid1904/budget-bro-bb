import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
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
import { ReceiptShare } from "@/lib/android-receipt-share";

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

function NativeShareRouterBridge() {
  const navigate = useNavigate();
  const { user, loading } = useBudget();
  const pendingShareRef = useRef<string | null>(null);
  const [receivedShareId, setReceivedShareId] = useState<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const attachListener = async () => {
      const listener = await ReceiptShare.addListener('shareReceived', ({ id }) => {
        pendingShareRef.current = id;
        setReceivedShareId(id);
      });
      if (!active) {
        await listener.remove();
      }
    };

    void attachListener().catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || loading || !user) return;

    let active = true;
    const openPendingShare = async () => {
      let id = pendingShareRef.current || receivedShareId;
      if (!id) {
        const { shares } = await ReceiptShare.getPendingShares();
        id = shares[0]?.id || null;
      }
      if (active && id) navigate(`/expenses?nativeShare=${encodeURIComponent(id)}`, { replace: true });
    };

    void openPendingShare().catch(() => {});
    return () => { active = false; };
  }, [navigate, receivedShareId, user, loading]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BudgetProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NativeShareRouterBridge />
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/share-target" element={<Navigate to="/expenses?shared=no-sw&d=legacy" replace />} />
            <Route path="/share-target-v2" element={<Navigate to="/expenses?shared=no-sw&d=v2" replace />} />
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
