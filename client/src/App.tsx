import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import FeedPage from "@/pages/FeedPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import FriendsPage from "@/pages/FriendsPage";
import AuthPage from "@/pages/AuthPage";
import CommunitiesPage from "@/pages/CommunitiesPage";
import CommunityDetailPage from "@/pages/CommunityDetailPage";
import AnimeListPage from "@/pages/AnimeListPage";
import CardsPage from "@/pages/CardsPage";
import CardCatalogPage from "@/pages/CardCatalogPage";
import BenefitsPage from "@/pages/BenefitsPage";
import CreatePostPage from "@/pages/CreatePostPage";
import HelpPage from "@/pages/HelpPage";
import CodeOfEthicsPage from "@/pages/CodeOfEthicsPage";
import AdminPage from "@/pages/AdminPage";
import AdminPaymentExceptionsPage from "@/pages/AdminPaymentExceptionsPage";
import AdminSecurityMetricsPage from "@/pages/AdminSecurityMetricsPage";
import DrawsPage from "@/pages/DrawsPage";
import TokenShopPage from "@/pages/TokenShopPage";
import ParentDashboardPage from "@/pages/ParentDashboardPage";
import GamePage from "@/pages/GamePage";
import UniversePage from "@/pages/UniversePage";
import CheckoutPage from "@/pages/CheckoutPage";
import AccountPage from "@/pages/AccountPage";
import ActivatePage from "@/pages/ActivatePage";
import Layout from "@/components/layout/Layout";
import OnboardingFlow from "@/components/OnboardingFlow";
import { AuthProvider, useAuth } from "@/context/AuthContext";

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
    "/reset-password",
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
    return <ActivatePage />;
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

  // Logged out -> show Auth page
  if (!user) {
    return <AuthPage />;
  }

  if (showOnboarding && onboardingChecked) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={FeedPage} />
        <Route path="/profile">
          <Redirect to={`/${encodeURIComponent(user.handle || "@me")}`} />
        </Route>

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
        <Route
          path="/admin/payments-exceptions"
          component={AdminPaymentExceptionsPage}
        />
        <Route
          path="/admin/security-metrics"
          component={AdminSecurityMetricsPage}
        />
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
        <Route path="/reset-password">
          <Redirect to="/" />
        </Route>

        <Route component={NotFound} />
      </Switch>
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
