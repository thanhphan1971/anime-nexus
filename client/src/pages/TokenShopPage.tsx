import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { 
  Coins, Sparkles, Crown, Shield, AlertTriangle, Clock, 
  CreditCard, CheckCircle, XCircle, Gift, Zap, Star,
  FileText, Lock, UserCheck, Scale, Globe, Baby, Send
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Token packages configuration
const TOKEN_PACKAGES = [
  { id: "starter", name: "Starter Pack", tokens: 500, bonus: 0, price: 4.99, popular: false },
  { id: "popular", name: "Popular Pack", tokens: 1200, bonus: 100, price: 9.99, popular: true },
  { id: "value", name: "Value Pack", tokens: 2500, bonus: 300, price: 19.99, popular: false },
  { id: "mega", name: "Mega Pack", tokens: 5500, bonus: 800, price: 39.99, popular: false },
  { id: "ultimate", name: "Ultimate Pack", tokens: 12000, bonus: 2000, price: 79.99, popular: false },
];

interface PendingRequest {
  id: string;
  tokenAmount: number;
  amountInCents: number;
  status: string;
  createdAt: string;
}

interface ParentInfo {
  hasParent: boolean;
  parentName?: string;
  controls?: {
    purchasesEnabled: boolean;
    dailySpendLimit: number;  // in cents
    monthlySpendLimit: number;  // in cents
  };
  linkStatus?: string;
}

export default function TokenShopPage() {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<typeof TOKEN_PACKAGES[0] | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  const [confirmsAge, setConfirmsAge] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [limitExceeded, setLimitExceeded] = useState<'daily' | 'monthly' | null>(null);

  const isMinor = (user as any)?.isMinor || false;

  // Fetch parent info and controls for minor
  const { data: parentInfo } = useQuery<ParentInfo>({
    queryKey: ["/api/parent/my-parent"],
    queryFn: async () => {
      const res = await fetch("/api/parent/my-parent");
      if (!res.ok) return { hasParent: false };
      return res.json();
    },
    enabled: isMinor,
  });

  // Fetch pending authorization requests for minor
  const { data: pendingRequests = [] } = useQuery<PendingRequest[]>({
    queryKey: ["/api/parent/my-pending-requests"],
    queryFn: async () => {
      const res = await fetch("/api/parent/my-pending-requests");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isMinor,
  });

  // Get spending limits (default: $10/day, $50/month)
  const dailyLimit = parentInfo?.controls?.dailySpendLimit || 1000; // 1000 cents = $10
  const monthlyLimit = parentInfo?.controls?.monthlySpendLimit || 5000; // 5000 cents = $50

  // Request parent approval mutation
  const requestApprovalMutation = useMutation({
    mutationFn: async (data: { packageId: string; tokenAmount: number; amountInCents: number; reason: string }) => {
      const res = await fetch("/api/parent/auth-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send request");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Request sent to your parent for approval!");
      setShowRequestDialog(false);
      setRequestMessage("");
      setLimitExceeded(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handlePurchase = (pkg: typeof TOKEN_PACKAGES[0]) => {
    setSelectedPackage(pkg);
    const priceInCents = Math.round(pkg.price * 100);
    
    // Check if minor with linked parent
    if (isMinor && parentInfo?.hasParent) {
      // Check daily limit first (stricter)
      if (priceInCents > dailyLimit) {
        setLimitExceeded('daily');
        setShowRequestDialog(true);
        return;
      }
      // Check monthly limit
      if (priceInCents > monthlyLimit) {
        setLimitExceeded('monthly');
        setShowRequestDialog(true);
        return;
      }
    }
    
    // Within limits or not a linked minor - proceed to normal purchase
    setShowPurchaseDialog(true);
    setAgreesToTerms(false);
    setConfirmsAge(false);
  };

  const handleConfirmPurchase = () => {
    if (!agreesToTerms || !confirmsAge) {
      toast.error("Please accept all terms before purchasing");
      return;
    }
    toast.info("Payment integration coming soon! For now, use free tokens.");
    setShowPurchaseDialog(false);
  };

  const handleRequestApproval = () => {
    if (!selectedPackage) return;
    requestApprovalMutation.mutate({
      packageId: selectedPackage.id,
      tokenAmount: selectedPackage.tokens + selectedPackage.bonus,
      amountInCents: Math.round(selectedPackage.price * 100),
      reason: requestMessage,
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 p-6 rounded-2xl border border-yellow-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-yellow-400 neon-text">TOKEN SHOP</h1>
            <p className="text-muted-foreground text-sm">Power up your AniRealm experience</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-lg">
            <Coins className="h-5 w-5 text-yellow-400" />
            <span className="font-mono font-bold text-yellow-400">{user?.tokens?.toLocaleString() || 0}</span>
            <span className="text-xs text-muted-foreground">Current Balance</span>
          </div>
        </div>
      </div>

      {/* Minor Warning Banner */}
      {isMinor && (
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
            <div>
              <p className="font-bold text-orange-300">Minor Account - Spending Limits Active</p>
              <p className="text-sm text-muted-foreground">
                Your spending limits: <strong>${(dailyLimit / 100).toFixed(0)}/day</strong> and <strong>${(monthlyLimit / 100).toFixed(0)}/month</strong>. 
                For purchases exceeding these limits, you can request parent approval. 
                Your parent will receive a notification and can approve or deny the purchase.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests for Minors */}
      {isMinor && pendingRequests.length > 0 && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <Clock className="h-5 w-5" />
              Pending Approval Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Coins className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="font-medium">{req.tokenAmount.toLocaleString()} tokens</p>
                      <p className="text-sm text-muted-foreground">${(req.amountInCents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    <Clock className="h-3 w-3 mr-1" />
                    Waiting for Parent
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="packages" className="space-y-6">
        <TabsList className="bg-card/40 border border-white/10 p-1">
          <TabsTrigger value="packages" className="data-[state=active]:bg-primary/20">
            <Coins className="h-4 w-4 mr-2" /> Packages
          </TabsTrigger>
          <TabsTrigger value="rules" className="data-[state=active]:bg-primary/20">
            <FileText className="h-4 w-4 mr-2" /> Purchase Rules
          </TabsTrigger>
          <TabsTrigger value="minors" className="data-[state=active]:bg-primary/20">
            <Baby className="h-4 w-4 mr-2" /> Minor Limits
          </TabsTrigger>
          <TabsTrigger value="legal" className="data-[state=active]:bg-primary/20">
            <Scale className="h-4 w-4 mr-2" /> Legal
          </TabsTrigger>
        </TabsList>

        {/* PACKAGES TAB */}
        <TabsContent value="packages" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOKEN_PACKAGES.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`relative overflow-hidden transition-all hover:scale-[1.02] ${
                  pkg.popular 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50' 
                    : 'bg-card/40 border-white/10'
                }`}
                data-testid={`package-${pkg.id}`}
              >
                {pkg.popular && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                    BEST VALUE
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    {pkg.popular ? <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> : <Sparkles className="h-5 w-5 text-purple-400" />}
                    {pkg.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Coins className="h-8 w-8 text-yellow-400" />
                      <span className="text-4xl font-bold font-mono text-white">{pkg.tokens.toLocaleString()}</span>
                    </div>
                    {pkg.bonus > 0 && (
                      <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50">
                        <Gift className="h-3 w-3 mr-1" />
                        +{pkg.bonus} Bonus Tokens
                      </Badge>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-white">${pkg.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">USD</span>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {((pkg.tokens + pkg.bonus) / pkg.price).toFixed(0)} tokens per dollar
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full ${pkg.popular ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}`}
                    onClick={() => handlePurchase(pkg)}
                    data-testid={`button-buy-${pkg.id}`}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Purchase
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* What can you do with tokens */}
          <Card className="bg-card/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-cyan-400" />
                What Can You Do With Tokens?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: Sparkles, title: "Gacha Pulls", desc: "100 tokens per card pull" },
                  { icon: Crown, title: "S-Class Membership", desc: "Premium features & perks" },
                  { icon: Gift, title: "Draw Entries", desc: "Win real prizes" },
                  { icon: Star, title: "Marketplace", desc: "Buy rare cards from others" },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-lg text-center">
                    <item.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="font-bold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RULES TAB */}
        <TabsContent value="rules" className="space-y-4">
          <Card className="bg-card/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Rules for Purchasing Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6 text-sm">
                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-400" />
                      1. Age Eligibility
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Token purchases are only available to users <strong className="text-white">18 years old or older</strong>.</li>
                      <li>• If you are under 18, you must not purchase tokens directly.</li>
                      <li>• By purchasing tokens, you confirm that you are legally allowed to make online purchases in your country and region.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-cyan-400" />
                      2. Payment Methods
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Tokens can be purchased only through secure payment methods, including:</li>
                      <li className="ml-4">- Credit card</li>
                      <li className="ml-4">- Debit card</li>
                      <li className="ml-4">- PayPal</li>
                      <li className="ml-4">- Other approved services added in the future</li>
                      <li>• <strong className="text-white">No cash payments, gift cards, or cryptocurrency are accepted.</strong></li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Baby className="h-5 w-5 text-orange-400" />
                      3. Parental/Guardian Responsibility
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Users under 18 must have the approval of a parent or legal guardian to use the app.</li>
                      <li>• Parents/guardians are responsible for supervising the account and any activity.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-400" />
                      4. Refunds
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• <strong className="text-white">Token purchases are non-refundable.</strong></li>
                      <li>• Used tokens cannot be restored, refunded, transferred, or exchanged for money.</li>
                      <li>• Refunds are only processed in rare cases of:</li>
                      <li className="ml-4">- Unauthorized payment</li>
                      <li className="ml-4">- Confirmed technical purchase errors</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Lock className="h-5 w-5 text-purple-400" />
                      5. Limits & Controls
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• We reserve the right to:</li>
                      <li className="ml-4">- Limit token purchases within a 24-hour or monthly period</li>
                      <li className="ml-4">- Disable token purchases for minors</li>
                      <li className="ml-4">- Block excessive transactions to protect users</li>
                      <li>• These limits may change without notice to ensure safe gameplay.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-400" />
                      6. Tokens Have No Real-World Value
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Tokens are <strong className="text-white">virtual items only</strong></li>
                      <li>• Tokens cannot be:</li>
                      <li className="ml-4">- Converted into real money</li>
                      <li className="ml-4">- Sold</li>
                      <li className="ml-4">- Traded outside the app</li>
                      <li className="ml-4">- Transferred to another user</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      7. Disputes and Chargebacks
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Chargebacks will result in:</li>
                      <li className="ml-4">- Automatic account suspension</li>
                      <li className="ml-4">- Removal of items obtained with tokens</li>
                      <li className="ml-4">- Possible permanent account restrictions</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-400" />
                      8. Game Balance & Updates
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• We reserve the right to:</li>
                      <li className="ml-4">- Modify token prices</li>
                      <li className="ml-4">- Adjust rewards</li>
                      <li className="ml-4">- Add or remove features related to tokens</li>
                      <li className="ml-4">- Discontinue token purchases at any time</li>
                    </ul>
                  </section>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MINORS TAB */}
        <TabsContent value="minors" className="space-y-4">
          <Card className="bg-card/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Baby className="h-5 w-5 text-orange-400" />
                Limits for Minors Purchasing Tokens
              </CardTitle>
              <CardDescription>
                Special protections for users under 18 years old
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6 text-sm">
                  {/* Spending Limits Banner */}
                  <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-6 text-center">
                    <h3 className="text-xl font-bold text-orange-300 mb-4">Spending Limits for Minors</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/30 rounded-lg p-4">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                        <p className="text-2xl font-bold text-white">$5.00</p>
                        <p className="text-xs text-muted-foreground">Daily Limit</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-4">
                        <Coins className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                        <p className="text-2xl font-bold text-white">$25.00</p>
                        <p className="text-xs text-muted-foreground">Monthly Limit</p>
                      </div>
                    </div>
                  </div>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-400" />
                      1. No Direct Token Purchases
                    </h3>
                    <p className="text-muted-foreground">
                      Users under 18 cannot directly purchase tokens inside the app.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-400" />
                      2. Parental/Guardian Approval Required
                    </h3>
                    <p className="text-muted-foreground">
                      If a user is under 18, any purchase must be done by a parent or legal guardian, using their own payment method.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-cyan-400" />
                      3. Verified Payment Method Only
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>Token purchases for minor accounts are allowed only through verified adult payment methods, such as:</li>
                      <li className="ml-4">• Parent credit card</li>
                      <li className="ml-4">• Parent PayPal</li>
                      <li className="ml-4">• Other adult-owned methods</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Lock className="h-5 w-5 text-purple-400" />
                      4. No Saved Payment Authorization
                    </h3>
                    <p className="text-muted-foreground">
                      We do not allow minors to store payment methods or enable automatic future purchases.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-400" />
                      5. Maximum Spending Limits
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>To protect younger users, token spending may be automatically limited by:</li>
                      <li className="ml-4">• <strong className="text-white">Daily limit: $5.00 USD</strong></li>
                      <li className="ml-4">• <strong className="text-white">Monthly limit: $25.00 USD</strong></li>
                      <li className="ml-4">• Age group restrictions</li>
                      <li>These limits may be adjusted over time for safety.</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      6. Suspicious Activity is Blocked
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>If we detect unusual or excessive token usage on a minor's account, we may:</li>
                      <li className="ml-4">• Block the account from purchasing more tokens</li>
                      <li className="ml-4">• Require parental confirmation</li>
                      <li className="ml-4">• Temporarily suspend token transactions</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Baby className="h-5 w-5 text-orange-400" />
                      7. Parental Responsibility
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>Parents or guardians are responsible for:</li>
                      <li className="ml-4">• Approving purchases</li>
                      <li className="ml-4">• Securing their payment method</li>
                      <li className="ml-4">• Monitoring app activity on the minor's account</li>
                    </ul>
                  </section>

                  {/* Receipt Notification */}
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 mt-6">
                    <h3 className="font-bold text-blue-300 mb-2">🔔 Purchase Notifications to Parents</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Whenever a minor makes a token purchase, a transaction receipt will be emailed automatically to the parent/guardian on file.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Receipt includes: amount paid, date/time, payment method, items purchased, and remaining limits.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEGAL TAB */}
        <TabsContent value="legal" className="space-y-4">
          <Card className="bg-card/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-400" />
                Legal Compliance & Privacy
              </CardTitle>
              <CardDescription>
                Our commitment to user protection and legal compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6 text-sm">
                  <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                    <h3 className="font-bold text-red-300 mb-2">⭐ Kid-Safety / Legal Notice</h3>
                    <p className="text-muted-foreground">
                      Purchasing tokens is a paid feature intended for adults only. We strongly encourage parents to monitor their children's account activity, enable payment protections, and disable auto-purchases on connected services.
                    </p>
                  </div>

                  <section>
                    <h3 className="font-bold text-lg mb-3">Regulatory Compliance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-blue-400" />
                          <span className="font-bold">COPPA (USA)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Children's Online Privacy Protection Act - Protects children under 13 in the United States
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-purple-400" />
                          <span className="font-bold">GDPR-Kids (EU)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          General Data Protection Regulation - Protects minors in the European Union
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-red-400" />
                          <span className="font-bold">PIPEDA (Canada)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Personal Information Protection and Electronic Documents Act - Canadian privacy law
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="h-5 w-5 text-cyan-400" />
                          <span className="font-bold">Loi 25 (Québec)</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Québec's modernized privacy act with strict protections for minors and personal data
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2">Data Collection & Privacy</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• We collect only necessary information for purchases</li>
                      <li>• Payment information is processed securely by third-party providers</li>
                      <li>• Users have the right to request data deletion</li>
                      <li>• All data handling complies with applicable privacy laws</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg mb-2">App Store Compliance</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Age gating implemented</li>
                      <li>• Parental controls available</li>
                      <li>• Clear refund policy stated</li>
                      <li>• Data collection consent obtained</li>
                    </ul>
                  </section>

                  <div className="bg-white/5 rounded-lg p-4 mt-6">
                    <p className="text-xs text-muted-foreground text-center">
                      For questions about our policies, please contact our support team. By using AniRealm and purchasing tokens, you agree to these terms and conditions.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Confirm Purchase
            </DialogTitle>
            <DialogDescription>
              You are about to purchase {selectedPackage?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Coins className="h-6 w-6 text-yellow-400" />
                  <span className="text-2xl font-bold">{selectedPackage.tokens.toLocaleString()}</span>
                  {selectedPackage.bonus > 0 && (
                    <span className="text-green-400">+{selectedPackage.bonus}</span>
                  )}
                  <span className="text-muted-foreground">tokens</span>
                </div>
                <p className="text-xl font-bold">${selectedPackage.price} USD</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="age" 
                    checked={confirmsAge}
                    onCheckedChange={(checked) => setConfirmsAge(checked as boolean)}
                  />
                  <label htmlFor="age" className="text-sm text-muted-foreground cursor-pointer">
                    I confirm that I am <strong>18 years or older</strong>, or this purchase is being made by my parent/guardian.
                  </label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="terms" 
                    checked={agreesToTerms}
                    onCheckedChange={(checked) => setAgreesToTerms(checked as boolean)}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    I have read and agree to the <strong>Purchase Rules</strong>. I understand that token purchases are <strong>non-refundable</strong> and tokens have no real-world value.
                  </label>
                </div>
              </div>

              {isMinor && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 text-sm">
                  <p className="text-orange-300">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    Minor Account: A receipt will be sent to your parent/guardian.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPurchase}
              disabled={!agreesToTerms || !confirmsAge}
              className="bg-gradient-to-r from-yellow-500 to-orange-500"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Parent Approval Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={(open) => { setShowRequestDialog(open); if (!open) setLimitExceeded(null); }}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-400" />
              Request Parent Approval
            </DialogTitle>
            <DialogDescription>
              {limitExceeded === 'daily' 
                ? `This purchase exceeds your daily limit of $${(dailyLimit / 100).toFixed(0)}. Send a request to your parent for approval.`
                : `This purchase exceeds your monthly limit of $${(monthlyLimit / 100).toFixed(0)}. Send a request to your parent for approval.`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedPackage && (
            <div className="space-y-4">
              <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3 text-sm">
                <p className="text-orange-300 font-medium">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  {limitExceeded === 'daily' 
                    ? `Exceeds daily limit: $${selectedPackage.price} > $${(dailyLimit / 100).toFixed(0)}/day`
                    : `Exceeds monthly limit: $${selectedPackage.price} > $${(monthlyLimit / 100).toFixed(0)}/month`
                  }
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Coins className="h-6 w-6 text-yellow-400" />
                  <span className="text-2xl font-bold">{selectedPackage.tokens.toLocaleString()}</span>
                  {selectedPackage.bonus > 0 && (
                    <span className="text-green-400">+{selectedPackage.bonus}</span>
                  )}
                  <span className="text-muted-foreground">tokens</span>
                </div>
                <p className="text-xl font-bold">${selectedPackage.price} USD</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message to Parent (optional)</label>
                <Textarea
                  placeholder="Tell your parent why you'd like to make this purchase..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="bg-white/5"
                  data-testid="input-request-message"
                />
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-sm">
                <p className="text-blue-300">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Your parent will receive this request and can approve or deny it. The request expires in 7 days.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestApproval}
              disabled={requestApprovalMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-purple-500"
              data-testid="button-send-request"
            >
              <Send className="h-4 w-4 mr-2" />
              {requestApprovalMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
