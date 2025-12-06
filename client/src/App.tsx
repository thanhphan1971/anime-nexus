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
import ChatPage from "@/pages/ChatPage";
import AnimeListPage from "@/pages/AnimeListPage";
import GachaPage from "@/pages/GachaPage";
import PremiumPage from "@/pages/PremiumPage";
import CreatePostPage from "@/pages/CreatePostPage";
import MarketplacePage from "@/pages/MarketplacePage";
import Layout from "@/components/layout/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function Router() {
  const { user, isLoading } = useAuth();
// ...
  if (isLoading) {
// ...
  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={FeedPage} />
        <Route path="/profile/:id" component={ProfilePage} />
        <Route path="/friends" component={FriendsPage} />
        <Route path="/communities" component={CommunitiesPage} />
        <Route path="/community/:id" component={ChatPage} />
        <Route path="/watchlist" component={AnimeListPage} />
        <Route path="/gacha" component={GachaPage} />
        <Route path="/market" component={MarketplacePage} />
        <Route path="/premium" component={PremiumPage} />
        <Route path="/create" component={CreatePostPage} />
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
