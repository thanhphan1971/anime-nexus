import { Link, useLocation } from "wouter";
import { Home, Users, User, LogOut, PlusSquare, Search, Zap, MessageSquare, PlayCircle, Gift } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return <>{children}</>;

  const navItems = [
    { icon: Home, label: "Feed", path: "/" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: MessageSquare, label: "Communities", path: "/communities" },
    { icon: PlayCircle, label: "Watch List", path: "/watchlist" },
    { icon: Gift, label: "Daily Gacha", path: "/gacha" },
    { icon: PlusSquare, label: "Create", path: "/create" },
    { icon: User, label: "Profile", path: `/profile/${user.id}` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/40 bg-card/30 backdrop-blur-xl sticky top-0 h-screen p-6">
        <div className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center shadow-[0_0_15px_hsl(var(--primary))]">
            <Zap className="text-white h-5 w-5 fill-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider neon-text font-display">ANIVERSE REALM</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 text-lg h-12 rounded-xl transition-all duration-300 ${
                  location === item.path 
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

        <div className="mt-auto pt-6 border-t border-border/40">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-white/5">
            <Avatar>
              <AvatarImage src={user.avatar} />
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.handle}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-16 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-2">
          <Zap className="text-primary h-6 w-6 fill-primary" />
          <span className="font-display font-bold text-xl">ANIVERSE REALM</span>
        </div>
        <Avatar className="h-8 w-8">
           <AvatarImage src={user.avatar} />
           <AvatarFallback>ME</AvatarFallback>
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
            <div className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
               location === item.path ? "text-primary" : "text-muted-foreground"
            }`}>
              <item.icon size={24} className={location === item.path ? "fill-primary/20" : ""} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}
