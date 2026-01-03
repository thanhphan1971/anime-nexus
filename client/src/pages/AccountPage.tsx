import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  User as UserIcon,
  Mail,
  Shield,
  Crown,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<"monthly" | "yearly" | null>(null);

  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancel" | null>(null);

  const { data: sclassStatus } = useSClassStatus();

  // Prevent infinite sync loop
  const didSyncRef = useRef(false);

  // ---------- helpers ----------
  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return formatInTimeZone(new Date(iso), "America/Toronto", "MMM d, yyyy • h:mm a");
    } catch {
      return iso;
    }
  };

  const isAdminGranted = sclassStatus?.accessSource === "admin_grant";
  const isSClass = Boolean(user?.isPremium) || Boolean(isAdminGranted);

  const statusBadge = () => {
    if (isAdminGranted) {
      return (
        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
          Admin Granted
        </Badge>
      );
    }
    if (user?.isPremium) {
      return (
        <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-white/10 text-muted-foreground">
        Free
      </Badge>
    );
  };

  // ---------- 1) redirect if logged out ----------
  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  // ---------- 2) Get Supabase access token ----------
  useEffect(() => {
    const getToken = async () => {
      try {
        const supabase = await getSupabase();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token || "";
        setAccessToken(token);

        // allow sync once token is available
        didSyncRef.current = false;

        if (!token) console.warn("[AccountPage] No access token in session");
      } catch (err) {
        console.error("[AccountPage] Failed to get session:", err);
      } finally {
        setIsTokenLoading(false);
      }
    };
    getToken();
  }, []);

  // ---------- 3) Handle ?checkout=success|cancel ----------
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      if (params.get("checkout") === "success") {
        setCheckoutStatus("success");
        toast.success("Subscription activated!");
        refreshUser();
        window.history.replaceState({}, "", "/account");
        return;
      }

      if (params.get("checkout") === "cancel") {
        setCheckoutStatus("cancel");
        toast.info("Checkout canceled.");
        window.history.replaceState({}, "", "/account");
      }
    } catch (err) {
      console.error("[AccountPage] Failed to read checkout params:", err);
    }
  }, [refreshUser]);

  // ---------- 4) Sync Stripe -> DB once per token ----------
  useEffect(() => {
    const sync = async () => {
      if (!accessToken) return;
      if (didSyncRef.current) return;

      didSyncRef.current = true;

      try {
        const res = await fetch("/api/stripe/subscription", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn("[AccountPage] subscription sync failed:", res.status, text);
          didSyncRef.current = false;
          return;
        }

        await refreshUser();
      } catch (err) {
        console.error("[AccountPage] Failed to sync subscription:", err);
        didSyncRef.current = false;
      }
    };

    sync();
  }, [accessToken, refreshUser]);

  // ---------- actions ----------
  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    if (!accessToken) {
      toast.error("Please log in again to subscribe.");
      return;
    }

    if (isLoadingCheckout) return;

    setIsLoadingCheckout(plan);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create checkout session");
      }

      if (!data?.url) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("[AccountPage] checkout error:", err);
      toast.error(err?.message || "Checkout failed");
    } finally {
      setIsLoadingCheckout(null);
    }
  };

  const handleManageBilling = async () => {
    if (!accessToken) {
      toast.error("Please log in again to manage billing.");
      return;
    }

    if (isLoadingPortal) return;

    setIsLoadingPortal(true);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.error || "Portal failed");
      }

      if (!data?.url) {
        throw new Error("Billing portal did not return a URL");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("[AccountPage] portal error:", err);
      toast.error(err?.message || "Failed to open billing portal");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.history.back()}
        className="mb-2"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-display font-bold neon-text" data-testid="text-account-title">
          My Account
        </h1>
        <p className="text-muted-foreground" data-testid="text-account-subtitle">
          Private account settings and billing
        </p>
      </div>

      {checkoutStatus === "success" && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-sm">
            Subscription activated successfully.
          </AlertDescription>
        </Alert>
      )}

      {checkoutStatus === "cancel" && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-sm">
            Checkout was canceled. You can try again anytime.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription data-testid="text-account-handle">
            @{String(user.handle || user.username || "").replace("@", "")}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Private Information
          </CardTitle>
          <CardDescription>This information is only visible to you</CardDescription>
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
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Parent Email</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-parent-email">
                  {user.parentEmail}
                </span>
              </div>
            )}

            {user.ageGroup && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Age Group</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-age-group">
                  {user.ageGroup}
                </span>
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
          <CardDescription>Manage your S-Class membership</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Status</span>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge()}
                {user?.isPremium ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {user?.subscriptionType && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Plan</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-plan">
                  {user.subscriptionType}
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
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                alert("MANAGE BILLING CLICKED");

                try {
                  // If token is missing, you'll see it immediately
                  if (!accessToken) {
                    alert("NO ACCESS TOKEN (Supabase session missing)");
                    toast.error("Please log in again to manage billing.");
                    return;
                  }

                  if (isLoadingPortal) {
                    alert("ALREADY OPENING (isLoadingPortal=true)");
                    return;
                  }

                  setIsLoadingPortal(true);

                  const res = await fetch("/api/stripe/portal", {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                    credentials: "include",
                  });

                  const raw = await res.text();
                  let data: any = {};
                  try {
                    data = JSON.parse(raw);
                  } catch {
                    // keep raw text for debugging
                  }

                  if (!res.ok) {
                    alert(`PORTAL ERROR ${res.status}: ${raw || "no body"}`);
                    toast.error(data?.error || raw || "Failed to open billing portal");
                    return;
                  }

                  if (!data?.url) {
                    alert(`NO URL RETURNED: ${raw || "empty"}`);
                    toast.error("Billing portal did not return a URL.");
                    return;
                  }

                  window.location.href = data.url;
                } catch (err: any) {
                  console.error("[AccountPage] portal error:", err);
                  alert(`PORTAL JS ERROR: ${err?.message || String(err)}`);
                  toast.error(err?.message || "Failed to open billing portal");
                } finally {
                  setIsLoadingPortal(false);
                }
              }}
              disabled={isLoadingPortal}
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

