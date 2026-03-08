import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import Layout from "@/components/layout/Layout";
import OnboardingFlow from "@/components/OnboardingFlow";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Keep these eager (small/critical)
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";

// Lazy-load everything else (big bundle win)
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const FriendsPage = lazy(() => import("@/pages/FriendsPage"));
const CommunitiesPage = lazy(() => import("@/pages/CommunitiesPage"));
const CommunityDetailPage = lazy(() => import("@/pages/CommunityDetailPage"));
const AnimeListPage = lazy(() => import("@/pages/AnimeListPage"));
const CardsPage = lazy(() => import("@/pages/CardsPage"));
const CardCatalogPage = lazy(() => import("@/pages/CardCatalogPage"));
const BenefitsPage = lazy(() => import("@/pages/BenefitsPage"));
const CreatePostPage = lazy(() => import("@/pages/CreatePostPage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const CodeOfEthicsPage = lazy(() => import("@/pages/CodeOfEthicsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AdminPaymentExceptionsPage = lazy(() => import("@/pages/AdminPaymentExceptionsPage"));
const AdminSecurityMetricsPage = lazy(() => import("@/pages/AdminSecurityMetricsPage"));
const DrawsPage = lazy(() => import("@/pages/DrawsPage"));
const TokenShopPage = lazy(() => import("@/pages/TokenShopPage"));
const ParentDashboardPage = lazy(() => import("@/pages/ParentDashboardPage"));
const GamePage = lazy(() => import("@/pages/GamePage"));
const UniversePage = lazy(() => import("@/pages/UniversePage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const ActivatePage = lazy(() => import("@/pages/ActivatePage"));

// Small loading UI for lazy chunks
function PageLoading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-display tracking-widest animate-pulse">LOADING...</p>
      </div>
    </div>
  );
}

// ✅ Added: fixes "Redirect is not defined" + avoids full page reloads
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);

  return null;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // ✅ Detect legacy auth URLs
    const legacyAuthPaths = [
    "/login",
    "/signup",
    "/sign-in",
    "/sign-up",
    "/auth",
    "/auth/callback",
  ];

  const isLegacyAuth = legacyAuthPaths.some(
    (p) =>
      location === p ||
      location.startsWith(p + "?") ||
      location.startsWith(p + "/")
  );

  // ✅ HARD redirect immediately (prevents dim overlay completely)
  useEffect(() => {
    if (isLegacyAuth) {
      window.location.replace("/");
    }
  }, [isLegacyAuth]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      const hasSeenOnboarding = localStorage.getItem(
        `onboarding_seen_${user.id}`
      );
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    }
  }, [user, isLoading]);
  
  // ✅ Prefetch high-frequency pages after login (idle time)
useEffect(() => {
  // Do not prefetch if:
  // - user not loaded
  // - auth still loading
  // - onboarding is showing
  if (!user || isLoading || showOnboarding) return;

  const prefetch = () => {
    import("@/pages/ProfilePage");
    import("@/pages/TokenShopPage");
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(prefetch);
  } else {
    setTimeout(prefetch, 1500);
  }
}, [user, isLoading, showOnboarding]);


  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_seen_${user.id}`, "true");
    }
    setShowOnboarding(false);
    setLocation("/");
  };

  // ✅ Do NOT render anything while redirecting
  if (isLegacyAuth) {
    return null;
  }

  // ✅ Small hardening: supports /activate?token=...
  if (location.startsWith("/activate")) {
    return (
      <Suspense fallback={<PageLoading />}>
        <ActivatePage />
      </Suspense>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-display tracking-widest animate-pulse">
            INITIALIZING...
          </p>
        </div>
      </div>
    );
  }

    // Logged out -> allow auth-related public pages
  if (!user) {
    if (location === "/forgot-password") {
      return <ForgotPasswordPage />;
    }

    if (
      location === "/reset-password" ||
      location.startsWith("/reset-password?")
    ) {
      return <ResetPasswordPage />;
    }

    return <AuthPage />;
  }

  console.log("[Router user]", user?.id, user?.username, user?.handle);

  if (showOnboarding && onboardingChecked) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/" component={FeedPage} />

          <Route path="/profile" component={ProfilePage} />
          <Route path="/profile/:handle" component={ProfilePage} />
          <Route path="/@:handle" component={ProfilePage} />

          <Route path="/settings" component={SettingsPage} />
          <Route path="/friends" component={FriendsPage} />
          <Route path="/communities" component={CommunitiesPage} />
          <Route path="/community/:id" component={CommunityDetailPage} />
          <Route path="/watchlist" component={AnimeListPage} />
          <Route path="/cards" component={CardsPage} />
          <Route path="/cards/catalog" component={CardCatalogPage} />
          <Route path="/draws" component={DrawsPage} />

          {/* Existing redirects */}
          <Route path="/sclass">
            <Redirect to="/account" />
          </Route>
          <Route path="/premium">
            <Redirect to="/account" />
          </Route>

          <Route path="/benefits" component={BenefitsPage} />
          <Route path="/create" component={CreatePostPage} />
          <Route path="/help" component={HelpPage} />
          <Route path="/ethics" component={CodeOfEthicsPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/payments-exceptions" component={AdminPaymentExceptionsPage} />
          <Route path="/admin/security-metrics" component={AdminSecurityMetricsPage} />
          <Route path="/tokens" component={TokenShopPage} />
          <Route path="/parent" component={ParentDashboardPage} />
          <Route path="/game" component={GamePage} />
          <Route path="/universe" component={UniversePage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/account" component={AccountPage} />

          {/* Legacy routes */}
          <Route path="/gacha" component={CardsPage} />
          <Route path="/market" component={CardsPage} />

          {/* Fix: handle old auth URLs so they never hit NotFound */}
          <Route path="/login">
            <Redirect to="/" />
          </Route>
          <Route path="/signup">
            <Redirect to="/" />
          </Route>
          <Route path="/sign-in">
            <Redirect to="/" />
          </Route>
          <Route path="/sign-up">
            <Redirect to="/" />
          </Route>
          <Route path="/auth">
            <Redirect to="/" />
          </Route>
          <Route path="/auth/callback">
            <Redirect to="/" />
          </Route>
                    <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
