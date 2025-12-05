import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import FeedPage from "./pages/FeedPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import CreatePostPage from "./pages/CreatePostPage.jsx";
import FriendsPage from "./pages/FriendsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        <p>Loading your anime world...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/create" element={<CreatePostPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;
