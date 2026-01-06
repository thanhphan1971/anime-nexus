import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useSClassStatus } from "@/lib/api";
import { getSupabase } from "@/lib/supabaseClient";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  Crown,
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  UserIcon,
  Shield,
  Mail,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const [accessToken, setAccessToken] = useState<string>("");
  const [isTokenLoading, setIsTokenLoading] = useState(true);

  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState<
    "monthly" | "yearly" | null
  >(null);

  const [checkoutStatus, setCheckoutStatus] = useState<"success" | "cancel" | null>(
    null
  );

  const { data: sclassStatus } = useSClassStatus();

  // ✅ TEMP DEBUG: confirm UI receives premiumEndDate
  console.log(
    "SUB DEBUG premiumEndDate:",
    sclassStatus?.premiumEndDate,
    sclassStatus
  );

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
  const isSClass = Boolean(sclassStatus?.isPremium) || Boolean(isAdminGranted);

  // ✅ Premium is active when Stripe status is active (or trialing). Cancel-at-period-end is a separate flag.
  const isPremiumActive =
    sclassStatus?.isPremium === true &&
    (sclassStatus?.subscriptionStatus === "active" ||
      sclassStatus?.subscriptionStatus === "trialing");

  // ✅ Cancellation intent flag (still active until premiumEndDate)
  const isCancelingAtPeriodEnd = sclassStatus?.willCancelAtPeriodEnd === true;

  const statusBadge = () => {
    if (isAdminGranted) {
      return (
        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
          Admin Granted
        </Badge>
      );
    }
    if (isPremiumActive) {
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

// ✅ NEW: When Account page loads (or user returns from Stripe portal), force a fresh subscription sync
useEffect(() => {
  if (!accessToken) return;

  // Hit the sync endpoint once to see latest cancel/resubscribe changes immediately
  fetch("/api/stripe/subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => {
    // ignore; the react-query hook will also keep things updated
  });
}, [accessToken]);

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
    if (isLoadingPortal) return;

    setIsLoadingPortal(true);

    try {
      // Always pull a fresh token at click time (prevents stale/empty token 401)
      const supabase = await getSupabase();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      const raw = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(raw);
      } catch {
        // keep raw
      }

      if (!res.ok) {
        throw new Error(json?.error || raw || `Portal failed (${res.status})`);
      }

      if (!json?.url) {
        throw new Error("Portal did not return a URL");
      }

      window.location.href = json.url;
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

            {user.ageBand && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Age Group</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-age-group">
                  {user.ageBand}
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

            {user?.subscriptionPlan && (
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Plan</span>
                </div>
                <span className="text-sm font-medium" data-testid="text-account-plan">
                  {user.subscriptionPlan}
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

        {/* S-Class info (always visible for comparison) */}
        <Card className="mt-4">
            <CardHeader>
              <CardTitle>S-Class Membership</CardTitle>
              <CardDescription>
                Unlock premium perks that power your daily progress.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Free</div>
                    {!isPremiumActive && (
                      <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Your current plan
                      </Badge>
                    )}
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <Link href="/cards" className="text-primary hover:underline">1 free summon / day</Link></li>
                    <li>• Standard odds + standard rewards</li>
                    <li>• Join weekly + monthly draws</li>
                    <li>• Basic profile customization</li>
                    <li>• Community access</li>
                  </ul>
                </div>

            <div className="rounded-lg border p-4">
  <div className="flex items-center justify-between mb-2">
    <div className="font-semibold">S-Class</div>

    {isSClass ? (
      <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
        Your current plan
      </Badge>
    ) : (
      <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
        Premium
      </Badge>
    )}
  </div>

  <ul className="text-sm space-y-1 text-muted-foreground">
    <li>
      •{" "}
      <Link href="/cards" className="text-primary hover:underline">
        2 free summons / day
      </Link>
    </li>
    <li>• Additional daily game and summon entries</li>
    <li>• Higher daily token earning limits</li>
    <li>• Access to weekly and monthly draws</li>
    <li>• Exclusive S-Class identity badge</li>
    <li>• Manage billing + cancel anytime</li>
  </ul>
</div>

<div className="text-xs text-muted-foreground space-y-1">
  <p>Payments are handled by Stripe (secure checkout).</p>

  {isSClass && sclassStatus?.premiumEndDate && (
    <p>
      {sclassStatus?.willCancelAtPeriodEnd ? (
        <>
          Cancels on{" "}
          {new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "long",
            day: "2-digit",
            timeZone: "America/Toronto",
          }).format(new Date(sclassStatus.premiumEndDate))}
          . Your membership stays active until then.
        </>
      ) : (
        <>
          Next billing on{" "}
          {new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "long",
            day: "2-digit",
            timeZone: "America/Toronto",
          }).format(new Date(sclassStatus.premiumEndDate))}
          .
        </>
      )}
    </p>
  )}

  <p>
    If you already have an active subscription, use{" "}
    <span className="font-medium">Manage Billing</span>.
  </p>
</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

{/* Billing & Cancellation Info - Collapsible */}
<Collapsible className="mt-4">
  <Card>
    <CollapsibleTrigger className="w-full">
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-white/5 transition-colors rounded-t-lg">
        <CardTitle className="text-lg">Billing & Cancellation</CardTitle>
        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [&[data-state=open]]:rotate-180" />
      </CardHeader>
    </CollapsibleTrigger>

    <CollapsibleContent>
      <CardContent className="space-y-4 text-sm pt-0">
        {/* Manage Billing Button */}
        {isSClass && (
          <Button
            onClick={handleManageBilling}
            disabled={isLoadingPortal}
            className="w-full"
            variant="outline"
            data-testid="button-manage-billing"
          >
            {isLoadingPortal ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening Portal...
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
        )}

        <div>
          <h4 className="font-semibold mb-1">Cancel anytime</h4>
          <p className="text-muted-foreground">
            You can cancel your S-Class subscription at any time.
            {sclassStatus?.premiumEndDate && sclassStatus?.willCancelAtPeriodEnd && (
              <>
                {" "}
                Your benefits remain active until{" "}
                {new Intl.DateTimeFormat("en-CA", {
                  year: "numeric",
                  month: "long",
                  day: "2-digit",
                  timeZone: "America/Toronto",
                }).format(new Date(sclassStatus.premiumEndDate))}
                .
              </>
            )}
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-1">How to cancel</h4>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside">
            <li>Go to Account → Manage Billing</li>
            <li>In the billing portal, choose Cancel subscription</li>
            <li>
              You'll receive a confirmation from Stripe, and your AniRealm account
              will update shortly after
            </li>
          </ul>
        </div>

        {sclassStatus?.willCancelAtPeriodEnd ? (
          <div>
            <h4 className="font-semibold mb-1">Cancellation scheduled</h4>
            <p className="text-muted-foreground">
              Your subscription is set to end on{" "}
              <span className="font-medium">
                {sclassStatus?.premiumEndDate
                  ? new Intl.DateTimeFormat("en-CA", {
                      year: "numeric",
                      month: "long",
                      day: "2-digit",
                      timeZone: "America/Toronto",
                    }).format(new Date(sclassStatus.premiumEndDate))
                  : "—"}
              </span>
              . You’ll keep S-Class perks until then. You will not be charged again
              unless you re-subscribe.
            </p>
          </div>
        ) : (
          <div>
            <h4 className="font-semibold mb-1">What happens after you cancel</h4>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Your S-Class benefits stay active until the end of your current billing period</li>
              <li>You won't be charged again unless you re-subscribe</li>
              <li>When the billing period ends, your account automatically returns to Free</li>
            </ul>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-1">Refunds</h4>
          <p className="text-muted-foreground">
            AniRealm does not offer refunds for subscription charges, partial months,
            or unused time.
          </p>
          <p className="text-muted-foreground mt-1">
            <span className="font-medium">Exception:</span> If there is a confirmed
            billing error, contact support and we will review and correct it.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-1">Need help?</h4>
          <p className="text-muted-foreground">
            If you believe you were charged incorrectly, contact us with:
          </p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside mt-1">
            <li>The email on your AniRealm account</li>
            <li>The date/amount of the charge</li>
            <li>(Optional) The Stripe receipt/invoice ID</li>
          </ul>
        </div>
      </CardContent>
    </CollapsibleContent>
      </Card>
    </Collapsible>
    </div>
  );
}




