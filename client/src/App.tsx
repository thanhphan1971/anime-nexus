import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import FeedPage from "@/pages/FeedPage";
import ProfilePage from "@/pages/ProfilePage";
import FriendsPage from "@/pages/FriendsPage";
import AuthPage from "@/pages/AuthPage";
import CommunitiesPage from "@/pages/CommunitiesPage";
import CommunityDetailPage from "@/pages/CommunityDetailPage";
import AnimeListPage from "@/pages/AnimeListPage";
import CardsPage from "@/pages/CardsPage";
import CardCatalogPage from "@/pages/CardCatalogPage";
import PremiumPage from "@/pages/PremiumPage";
import CreatePostPage from "@/pages/CreatePostPage";
import HelpPage from "@/pages/HelpPage";
import AdminPage from "@/pages/AdminPage";
import DrawsPage from "@/pages/DrawsPage";
import TokenShopPage from "@/pages/TokenShopPage";
import ParentDashboardPage from "@/pages/ParentDashboardPage";
import Layout from "@/components/layout/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="font-display tracking-widest animate-pulse">INITIALIZING...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={FeedPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/profile/:id" component={ProfilePage} />
        <Route path="/friends" component={FriendsPage} />
        <Route path="/communities" component={CommunitiesPage} />
        <Route path="/community/:id" component={CommunityDetailPage} />
        <Route path="/watchlist" component={AnimeListPage} />
        <Route path="/cards" component={CardsPage} />
        <Route path="/cards/catalog" component={CardCatalogPage} />
        <Route path="/draws" component={DrawsPage} />
        <Route path="/sclass" component={PremiumPage} />
        <Route path="/create" component={CreatePostPage} />
        <Route path="/help" component={HelpPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/tokens" component={TokenShopPage} />
        <Route path="/parent" component={ParentDashboardPage} />
        {/* Legacy routes redirecting or redundant */}
        <Route path="/gacha" component={CardsPage} />
        <Route path="/market" component={CardsPage} />
        <Route path="/premium" component={PremiumPage} />
        
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
