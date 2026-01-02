import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { User, Mail, Shield, Crown, CreditCard, Calendar, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { useSClassStatus } from "@/lib/api";
import { getSupabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [accessToken, setAccessToken] = useState<string>("");
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancel" | null>(null);

  const { data: sclassStatus } = useSClassStatus();

  useEffect(() => {
    const getToken = async () => {
      try {
        const supabase = await getSupabase();
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          setAccessToken(data.session.access_token);
        } else {
          console.warn("No access token in session");
        }
      } catch (error) {
        console.error("Failed to get session:", error);
      } finally {
        setIsTokenLoading(false);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setCheckoutStatus("success");
      toast.success("Welcome to S-Class! Your subscription is now active.");
      refreshUser();
      window.history.replaceState({}, "", "/account");
    } else if (params.get("checkout") === "cancel") {
      setCheckoutStatus("cancel");
      toast.info("Checkout was canceled. You can try again anytime.");
      window.history.replaceState({}, "", "/account");
    }
  }, [refreshUser]);

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    console.log("Subscribe clicked:", plan, "accessToken exists:", !!accessToken);
    
    if (!accessToken) {
      toast.error("Please log in again to subscribe");
      return;
    }

    if (isLoadingCheckout) {
      console.log("Already loading, ignoring click");
      return;
    }

    setIsLoadingCheckout(plan);
    console.log("Starting checkout request...");
    
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan }),
      });

      console.log("Checkout response status:", response.status);
      const data = await response.json();
      console.log("Checkout response data:", data);
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        console.log("Redirecting to:", data.url);
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to start checkout");
      setIsLoadingCheckout(null);
    }
  };

  const handleManageBilling = async () => {
    if (!accessToken) {
      toast.error("Please log in again");
      return;
    }

    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) {
    return null;
  }

  const isAdminGranted = sclassStatus?.accessSource === "admin_grant";
  const isSClass = user.isPremium || isAdminGranted;
  const subscriptionStatus = user.subscriptionStatus || "none";
  const isCanceledPendingExpiry = subscriptionStatus === "canceled_pending_expiry";

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "N/A";
    try {
      return formatInTimeZone(new Date(date), "America/Toronto", "MMM d, yyyy");
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-display font-bold neon-text" data-testid="text-account-title">
          My Account
        </h1>
        <p className="text-muted-foreground">Private account settings and billing</p>
      </div>

      {checkoutStatus === "success" && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Subscription Activated!</AlertTitle>
          <AlertDescription>
            Welcome to S-Class! Your premium benefits are now active.
          </AlertDescription>
        </Alert>
      )}

      {checkoutStatus === "cancel" && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <XCircle className="h-4 w-4 text-yellow-500" />
          <AlertTitle>Checkout Canceled</AlertTitle>
          <AlertDescription>
            No worries! You can subscribe anytime when you're ready.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/50 border-white/10">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/50">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
              alt={user.name || user.username}
              className="h-full w-full object-cover"
              data-testid="img-account-avatar"
            />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2" data-testid="text-account-name">
              {user.name || user.username}
              {isSClass && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  <Crown className="h-3 w-3 mr-1" />
                  S-Class
                </Badge>
              )}
            </CardTitle>
            <CardDescription data-testid="text-account-handle">
              @{user.handle?.replace("@", "") || user.username}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Private Information
          </CardTitle>
          <CardDescription>
            This information is only visible to you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email</span>
              </div>
              <span className="text-sm font-medium" data-testid="text-account-email">
                {user.email || "Not set"}
              </span>
            </div>

            {user.parentEmail && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Parent Email</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-parent-email">
                  {user.parentEmail}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Age Group</span>
              </div>
              <Badge variant="outline" data-testid="text-account-age-band">
                {user.ageBand || (user.isMinor ? "Minor" : "Adult")}
              </Badge>
            </div>

            {user.isMinor && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Parental Consent</span>
                </div>
                <Badge 
                  variant={user.parentalConsentGiven ? "default" : "secondary"}
                  data-testid="text-account-consent"
                >
                  {user.parentalConsentGiven ? "Given" : "Pending"}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-yellow-400" />
            Subscription
          </CardTitle>
          <CardDescription>
            Manage your S-Class membership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Status</span>
              </div>
              <Badge 
                variant={isSClass ? "default" : "secondary"}
                className={isSClass ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" : ""}
                data-testid="text-account-sub-status"
              >
                {isAdminGranted 
                  ? "Granted Access" 
                  : isCanceledPendingExpiry 
                    ? "Canceled (Active until end)" 
                    : subscriptionStatus === "active" 
                      ? "Active" 
                      : "Free"}
              </Badge>
            </div>

            {isSClass && user.subscriptionPlan && !isAdminGranted && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Plan</span>
                </div>
                <span className="text-sm font-medium capitalize" data-testid="text-account-plan">
                  {user.subscriptionPlan}
                </span>
              </div>
            )}

            {user.premiumEndDate && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isCanceledPendingExpiry ? "Access Until" : "Next Billing"}
                  </span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-end-date">
                  {formatDate(user.premiumEndDate)}
                </span>
              </div>
            )}

            {isAdminGranted && sclassStatus?.accessExpiresAt && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Access Expires</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-grant-expires">
                  {formatDate(sclassStatus.accessExpiresAt)}
                </span>
              </div>
            )}
          </div>

          <Separator className="bg-white/10" />

          {!isSClass && !user.isAdmin && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Upgrade to S-Class for premium benefits
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleSubscribe("monthly")}
                  disabled={isLoadingCheckout !== null || isTokenLoading}
                  className="bg-primary hover:bg-primary/80"
                  data-testid="button-subscribe-monthly"
                >
                  {isTokenLoading ? (
                    "Loading..."
                  ) : isLoadingCheckout === "monthly" ? (
                    "Redirecting..."
                  ) : (
                    <>Monthly $9.99</>
                  )}
                </Button>
                <Button
                  onClick={() => handleSubscribe("yearly")}
                  disabled={isLoadingCheckout !== null || isTokenLoading}
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                  data-testid="button-subscribe-yearly"
                >
                  {isTokenLoading ? (
                    "Loading..."
                  ) : isLoadingCheckout === "yearly" ? (
                    "Redirecting..."
                  ) : (
                    <>Yearly $79.99</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Save ~33% with yearly billing
              </p>
            </div>
          )}

          {isSClass && !isAdminGranted && user.stripeCustomerId && (
            <Button
              onClick={handleManageBilling}
              disabled={isLoadingPortal}
              variant="outline"
              className="w-full"
              data-testid="button-manage-billing"
            >
              {isLoadingPortal ? (
                "Opening..."
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Billing
                </>
              )}
            </Button>
          )}

          {isAdminGranted && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm">
                Your S-Class access was granted by an admin. You can still subscribe to continue access after it expires.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
