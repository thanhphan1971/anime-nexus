import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  User,
  LogOut,
  PlusSquare,
  Zap,
  MessageSquare,
  PlayCircle,
  Settings,
  Layers,
  HelpCircle,
  Coins,
  Shield,
  Gamepad2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/lib/api";
import { BetaBanner } from "@/components/BetaBanner";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: siteSettings } = useSiteSettings();

  if (!user) return <>{children}</>;

  const tokenShopEnabled = siteSettings?.tokenShopEnabled === "true";

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Gamepad2, label: "Fracture Trial", path: "/game" },
    { icon: Users, label: "Find Nakama", path: "/friends" },
    { icon: MessageSquare, label: "Communities", path: "/communities" },
    { icon: Layers, label: "Cards", path: "/cards" },
    ...(tokenShopEnabled ? [{ icon: Coins, label: "Token Shop", path: "/tokens" }] : []),
    { icon: PlayCircle, label: "Watch List", path: "/watchlist" },
    { icon: PlusSquare, label: "Create", path: "/create" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Account", path: "/account" },
    { icon: HelpCircle, label: "Help", path: "/help" },
    { icon: Shield, label: "Parent Controls", path: "/parent" },
    ...(user.isAdmin ? [{ icon: Settings, label: "Admin", path: "/admin" }] : []),
  ];

  const initials = (user.name || user.username || "A")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="min-h-screen text-foreground flex flex-col relative"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      {/* Global Aurelith Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(https://qxbvfdbetukguyvivwsf.supabase.co/storage/v1/object/public/media/ui/aurelith_bg_v1.1.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          filter: "blur(8px)",
          opacity: 0.25,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
      />

      <BetaBanner />

      <div className="flex flex-col md:flex-row flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl sticky top-0 h-screen p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-6 flex-shrink-0">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shadow-[0_0_15px_hsl(var(--primary))]">
              <Zap className="text-white h-5 w-5 fill-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider neon-text font-display">
              ANIREALM
            </h1>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 text-base h-11 rounded-xl transition-all duration-300 ${
                    location === item.path ||
                    (item.path !== "/" && location.startsWith(item.path))
                      ? "bg-primary/20 text-primary neon-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <item.icon className={location === item.path ? "stroke-[2.5px]" : ""} />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex-shrink-0 pt-4 border-t border-border/40">
            <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/5">
              <Avatar>
                <AvatarImage src={user.avatar || ""} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.handle}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </aside>

        {/* Mobile Topbar */}
        <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-16 bg-background/80 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center gap-2">
            <Zap className="text-primary h-6 w-6 fill-primary" />
            <span className="font-display font-bold text-xl">ANIREALM</span>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || ""} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-4xl mx-auto p-4 pb-24 md:p-8 md:pb-8 overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border/40 h-16 flex items-center justify-around z-50 px-2">
          {navItems.slice(0, 5).map((item) => (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  location === item.path ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon size={24} className={location === item.path ? "fill-primary/20" : ""} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
