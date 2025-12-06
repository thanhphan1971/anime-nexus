import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Zap, ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import heroBg from "@assets/generated_images/futuristic_neo-tokyo_cityscape.png";

export default function AuthPage() {
  const { login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    // Redirect handled by router/layout logic if needed, or just state change
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img src={heroBg} alt="Background" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/20 border border-primary/50 mb-4 shadow-[0_0_30px_hsl(var(--primary)/0.3)] backdrop-blur-sm">
            <Zap className="h-8 w-8 text-primary fill-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter neon-text mb-2">
            ANIREALM
          </h1>
          <p className="text-muted-foreground text-lg">
            Your Gateway to the Anime Dimension
          </p>
        </div>

        <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500 delay-150">
          <CardHeader>
            <CardTitle className="text-2xl text-center font-display tracking-wide">
              {isLogin ? "SYSTEM LOGIN" : "CREATE IDENTITY"}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin 
                ? "Enter your credentials to access the network." 
                : "Generate your AI profile and join the world."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Neural Link (Email)</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="user@neo-tokyo.net" 
                  className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passcode</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Sparkles className="animate-spin mr-2" />
                ) : (
                  <>
                    {isLogin ? "INITIALIZE LINK" : "GENERATE PROFILE"} <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "New to the system? create account" : "Already linked? Login"}
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
