import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { Zap, ArrowRight, Sparkles, Eye, EyeOff, AlertTriangle, Shield } from "lucide-react";
import { useLocation } from "wouter";
import heroBg from "@assets/generated_images/futuristic_neo-tokyo_cityscape.png";
import { toast } from "sonner";

export default function AuthPage() {
  const { login, signup, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    handle: "",
    birthDate: "",
    parentEmail: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const isMinor = useMemo(() => {
    if (!formData.birthDate) return false;
    const birth = new Date(formData.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 < 18;
    }
    return age < 18;
  }, [formData.birthDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        await login(formData.username, formData.password);
        toast.success("Welcome back!");
        setLocation("/");
      } else {
        // Validate minor registration
        if (isMinor && !formData.parentEmail) {
          toast.error("Parent/guardian email is required for users under 18");
          return;
        }
        
        // Generate random avatar
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`;
        
        await signup({
          username: formData.username,
          password: formData.password,
          name: formData.name || formData.username,
          handle: formData.handle || `@${formData.username}`,
          avatar,
          bio: "New to AniRealm",
          animeInterests: [],
          theme: "cyberpunk",
          birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
          isMinor,
          parentEmail: isMinor ? formData.parentEmail : undefined,
        });
        
        if (isMinor) {
          toast.success("Account created! A verification code has been sent to your parent/guardian.");
        } else {
          toast.success("Account created! Welcome to AniRealm!");
        }
        setLocation("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    }
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
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="NeoKai"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="handle">Handle</Label>
                    <Input 
                      id="handle" 
                      type="text" 
                      placeholder="@neokai"
                      value={formData.handle}
                      onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                      data-testid="input-handle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Date of Birth</Label>
                    <Input 
                      id="birthDate" 
                      type="date" 
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                      data-testid="input-birthdate"
                      required
                    />
                  </div>
                  
                  {isMinor && (
                    <div className="space-y-3">
                      <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-bold text-orange-300">Under 18 Account</p>
                            <p className="text-muted-foreground">
                              A parent/guardian email is required. They will receive a verification code to link and manage your account.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parentEmail" className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-400" />
                          Parent/Guardian Email
                        </Label>
                        <Input 
                          id="parentEmail" 
                          type="email" 
                          placeholder="parent@email.com"
                          value={formData.parentEmail}
                          onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                          className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                          data-testid="input-parent-email"
                          required
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  type="text" 
                  placeholder="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20"
                  data-testid="input-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="bg-white/5 border-white/10 focus:border-primary focus:ring-primary/20 pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                disabled={isLoading}
                data-testid="button-submit"
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
              data-testid="button-toggle-mode"
            >
              {isLogin ? "New to the system? Create account" : "Already linked? Login"}
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
