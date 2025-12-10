import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, Users, Settings, CreditCard, MessageSquare, 
  Sparkles, ShoppingBag, UserPlus, Check, X, Eye,
  AlertTriangle, Clock, DollarSign, Bell, Lock, Unlock, Coins
} from "lucide-react";

interface ParentalControls {
  purchasesEnabled: boolean;
  dailySpendLimit: number;
  monthlySpendLimit: number;
  drawsEnabled: boolean;
  paidDrawsEnabled: boolean;
  gachaEnabled: boolean;
  marketplaceEnabled: boolean;
  chatEnabled: boolean;
  friendRequestsEnabled: boolean;
  notifyOnPurchase: boolean;
  notifyOnDraw: boolean;
}

interface LinkedChild {
  id: string;
  childId: string;
  status: string;
  verifiedAt: string;
  child: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    tokens: number;
    level: number;
    isMinor: boolean;
  };
  controls: ParentalControls;
}

interface AuthRequest {
  id: string;
  childId: string;
  tokenAmount: number;
  amountInCents: number;
  reason: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  child: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
  };
}

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [localControls, setLocalControls] = useState<ParentalControls | null>(null);

  const { data: children = [], isLoading } = useQuery<LinkedChild[]>({
    queryKey: ["/api/parent/children"],
    queryFn: async () => {
      const res = await fetch("/api/parent/children");
      if (!res.ok) throw new Error("Failed to fetch children");
      return res.json();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/parent/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Verification failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Child account linked successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      setShowVerifyDialog(false);
      setVerificationCode("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateControlsMutation = useMutation({
    mutationFn: async ({ childId, controls }: { childId: string; controls: Partial<ParentalControls> }) => {
      const res = await fetch(`/api/parent/controls/${childId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(controls),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Parental controls updated!");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Authorization requests
  const [respondingTo, setRespondingTo] = useState<AuthRequest | null>(null);
  const [responseNote, setResponseNote] = useState("");

  const { data: authRequests = [] } = useQuery<AuthRequest[]>({
    queryKey: ["/api/parent/auth-requests"],
    queryFn: async () => {
      const res = await fetch("/api/parent/auth-requests");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, status, parentNote }: { requestId: string; status: 'approved' | 'denied'; parentNote?: string }) => {
      const res = await fetch(`/api/parent/auth-request/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, parentNote }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Response failed");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(variables.status === 'approved' ? "Purchase approved!" : "Purchase denied.");
      queryClient.invalidateQueries({ queryKey: ["/api/parent/auth-requests"] });
      setRespondingTo(null);
      setResponseNote("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSelectChild = (child: LinkedChild) => {
    setSelectedChild(child);
    setLocalControls(child.controls);
  };

  const handleSaveControls = () => {
    if (!selectedChild || !localControls) return;
    updateControlsMutation.mutate({
      childId: selectedChild.childId,
      controls: localControls,
    });
  };

  const handleToggle = (key: keyof ParentalControls) => {
    if (!localControls) return;
    setLocalControls({
      ...localControls,
      [key]: !localControls[key],
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-blue-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-blue-400 neon-text">PARENT DASHBOARD</h1>
            <p className="text-muted-foreground text-sm">Manage your children's AniRealm accounts</p>
          </div>
        </div>
      </div>

      {/* Link New Child */}
      <Card className="bg-card/40 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-400" />
            Link Child Account
          </CardTitle>
          <CardDescription>
            Enter the verification code your child received when they registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter verification code (e.g., ABC123)"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
              className="font-mono"
              data-testid="input-verification-code"
            />
            <Button 
              onClick={() => verifyMutation.mutate(verificationCode)}
              disabled={verificationCode.length < 6 || verifyMutation.isPending}
              data-testid="button-verify-code"
            >
              <Check className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Purchase Authorization Requests */}
      {authRequests.length > 0 && (
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Purchase Authorization Requests ({authRequests.length})
            </CardTitle>
            <CardDescription>
              Your children have requested approval for purchases that exceed their spending limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {authRequests.map((request) => (
                <div key={request.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.child.avatar} />
                        <AvatarFallback>{request.child.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.child.name}</p>
                        <p className="text-sm text-muted-foreground">@{request.child.handle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <Coins className="h-5 w-5" />
                        <span className="font-bold text-lg">{request.tokenAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-lg font-bold">${(request.amountInCents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {request.reason && (
                    <div className="mt-3 p-3 bg-white/5 rounded-lg">
                      <p className="text-sm text-muted-foreground">Message from child:</p>
                      <p className="text-sm mt-1">"{request.reason}"</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Expires: {new Date(request.expiresAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => respondMutation.mutate({ requestId: request.id, status: 'denied' })}
                        disabled={respondMutation.isPending}
                        data-testid={`button-deny-${request.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => respondMutation.mutate({ requestId: request.id, status: 'approved' })}
                        disabled={respondMutation.isPending}
                        data-testid={`button-approve-${request.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Children List */}
        <Card className="bg-card/40 border-white/10 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              Linked Children
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : children.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No linked children yet</p>
                <p className="text-sm mt-1">Use a verification code to link an account</p>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => handleSelectChild(child)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedChild?.id === child.id
                        ? 'bg-primary/20 border border-primary/50'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                    data-testid={`button-child-${child.childId}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={child.child.avatar} />
                        <AvatarFallback>{child.child.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{child.child.name}</p>
                        <p className="text-xs text-muted-foreground">@{child.child.handle}</p>
                      </div>
                      <Badge variant={child.controls?.purchasesEnabled ? "default" : "secondary"}>
                        {child.controls?.purchasesEnabled ? (
                          <Unlock className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {child.controls?.purchasesEnabled ? "Active" : "Locked"}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Controls Panel */}
        <Card className="bg-card/40 border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-400" />
              Parental Controls
            </CardTitle>
            <CardDescription>
              {selectedChild ? `Managing ${selectedChild.child.name}'s account` : "Select a child to manage their settings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedChild ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>Select a child from the list to manage their controls</p>
              </div>
            ) : !localControls ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Tabs defaultValue="spending" className="space-y-6">
                <TabsList className="bg-card border border-white/10">
                  <TabsTrigger value="spending">
                    <DollarSign className="h-4 w-4 mr-2" /> Spending
                  </TabsTrigger>
                  <TabsTrigger value="features">
                    <Sparkles className="h-4 w-4 mr-2" /> Features
                  </TabsTrigger>
                  <TabsTrigger value="notifications">
                    <Bell className="h-4 w-4 mr-2" /> Notifications
                  </TabsTrigger>
                </TabsList>

                {/* SPENDING TAB */}
                <TabsContent value="spending" className="space-y-6">
                  <div className="bg-white/5 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-yellow-400" />
                        <div>
                          <Label className="text-base">Token Purchases</Label>
                          <p className="text-xs text-muted-foreground">Allow purchasing tokens with real money</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.purchasesEnabled}
                        onCheckedChange={() => handleToggle("purchasesEnabled")}
                        data-testid="switch-purchases"
                      />
                    </div>
                  </div>

                  {localControls.purchasesEnabled && (
                    <>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Daily Spending Limit</Label>
                            <span className="font-mono text-yellow-400">
                              ${(localControls.dailySpendLimit / 100).toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            value={[localControls.dailySpendLimit]}
                            onValueChange={(val) => setLocalControls({ ...localControls, dailySpendLimit: val[0] })}
                            min={0}
                            max={2000}
                            step={100}
                            className="[&>.relative>.absolute]:bg-yellow-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Maximum amount your child can spend per day
                          </p>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Monthly Spending Limit</Label>
                            <span className="font-mono text-yellow-400">
                              ${(localControls.monthlySpendLimit / 100).toFixed(2)}
                            </span>
                          </div>
                          <Slider
                            value={[localControls.monthlySpendLimit]}
                            onValueChange={(val) => setLocalControls({ ...localControls, monthlySpendLimit: val[0] })}
                            min={0}
                            max={10000}
                            step={500}
                            className="[&>.relative>.absolute]:bg-yellow-500"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Maximum amount your child can spend per month
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* FEATURES TAB */}
                <TabsContent value="features" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        <div>
                          <Label className="text-sm">Card Gacha</Label>
                          <p className="text-xs text-muted-foreground">Pull cards from gacha</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.gachaEnabled}
                        onCheckedChange={() => handleToggle("gachaEnabled")}
                      />
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-5 w-5 text-cyan-400" />
                        <div>
                          <Label className="text-sm">Marketplace</Label>
                          <p className="text-xs text-muted-foreground">Buy/sell cards</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.marketplaceEnabled}
                        onCheckedChange={() => handleToggle("marketplaceEnabled")}
                      />
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Eye className="h-5 w-5 text-green-400" />
                        <div>
                          <Label className="text-sm">Free Draws</Label>
                          <p className="text-xs text-muted-foreground">Enter free prize draws</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.drawsEnabled}
                        onCheckedChange={() => handleToggle("drawsEnabled")}
                      />
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-yellow-400" />
                        <div>
                          <Label className="text-sm">Paid Draws</Label>
                          <p className="text-xs text-muted-foreground">Enter paid prize draws</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.paidDrawsEnabled}
                        onCheckedChange={() => handleToggle("paidDrawsEnabled")}
                      />
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-400" />
                        <div>
                          <Label className="text-sm">Community Chat</Label>
                          <p className="text-xs text-muted-foreground">Send messages in communities</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.chatEnabled}
                        onCheckedChange={() => handleToggle("chatEnabled")}
                      />
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserPlus className="h-5 w-5 text-pink-400" />
                        <div>
                          <Label className="text-sm">Friend Requests</Label>
                          <p className="text-xs text-muted-foreground">Send/receive friend requests</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.friendRequestsEnabled}
                        onCheckedChange={() => handleToggle("friendRequestsEnabled")}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* NOTIFICATIONS TAB */}
                <TabsContent value="notifications" className="space-y-4">
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-300">
                      <Bell className="h-4 w-4 inline mr-2" />
                      Receive notifications when your child performs these actions
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-yellow-400" />
                        <div>
                          <Label className="text-sm">Purchase Notifications</Label>
                          <p className="text-xs text-muted-foreground">Get notified when tokens are purchased</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.notifyOnPurchase}
                        onCheckedChange={() => handleToggle("notifyOnPurchase")}
                      />
                    </div>

                    <div className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        <div>
                          <Label className="text-sm">Draw Entry Notifications</Label>
                          <p className="text-xs text-muted-foreground">Get notified when entering draws</p>
                        </div>
                      </div>
                      <Switch
                        checked={localControls.notifyOnDraw}
                        onCheckedChange={() => handleToggle("notifyOnDraw")}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
          {selectedChild && localControls && (
            <CardFooter className="border-t border-white/10 pt-4">
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
                onClick={handleSaveControls}
                disabled={updateControlsMutation.isPending}
                data-testid="button-save-controls"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Child Account Summary */}
      {selectedChild && (
        <Card className="bg-card/40 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-400" />
              Account Summary: {selectedChild.child.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">{selectedChild.child.tokens}</p>
                <p className="text-xs text-muted-foreground">Current Tokens</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-cyan-400">{selectedChild.child.level}</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-400">$0.00</p>
                <p className="text-xs text-muted-foreground">Spent This Month</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-400">0</p>
                <p className="text-xs text-muted-foreground">Draw Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
