import { useState, useEffect } from "react"; 
import { useLocation } from "wouter";
import { Crown, Check, ArrowLeft, Loader2, Shield, CreditCard, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { apiCall } from "@/lib/api";
import { toast } from "sonner";

interface Price {
  id: string;
  unitAmount: number;
  currency: string;
  recurring: { interval: string };
  interval: string;
  metadata?: { plan?: string };
}

interface Product {
  id: string;
  name: string;
  description: string;
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [termsAcknowledged, setTermsAcknowledged] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan === 'yearly') {
      setSelectedPlan('yearly');
    }
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await apiCall("/api/stripe/products");
        if (data.product) {
          setProduct(data.product);
          setPrices(data.prices || []);
        }
      } catch (error: any) {
        // ✅ BILLING DISABLED HANDLING
        if (error?.status === 503) {
          toast.error("Billing is temporarily disabled during launch testing.");
          setProduct(null);
          setPrices([]);
        } else {
          toast.error("Failed to load subscription options");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const monthlyPrice = prices.find(p => p.interval === 'month' || p.recurring?.interval === 'month');
  const yearlyPrice = prices.find(p => p.interval === 'year' || p.recurring?.interval === 'year');
  const selectedPrice = selectedPlan === 'yearly' ? yearlyPrice : monthlyPrice;

  const handleCheckout = async () => {
    if (!selectedPrice) return;
    
    setCheckoutLoading(selectedPrice.id);
    try {
      const response = await apiCall("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId: selectedPrice.id }),
      });
      
      if (response.url) {
        window.location.href = response.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
          <p className="text-muted-foreground">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  if (!product || prices.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md bg-card/30 border-white/10">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Subscription options are not available at this time.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation("/premium")}
              data-testid="button-back-premium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <Button 
        variant="ghost" 
        onClick={() => setLocation("/premium")}
        className="text-muted-foreground hover:text-white"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to S-Class
      </Button>

      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-display font-black neon-text flex items-center justify-center gap-3">
          <Crown className="h-8 w-8 text-yellow-400" />
          Complete Your Upgrade
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Choose your S-Class membership plan. Taxes will be calculated based on your location.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          className={`relative cursor-pointer transition-all ${
            selectedPlan === 'monthly' 
              ? 'bg-black/40 border-yellow-500/50 shadow-[0_0_30px_hsl(45,100%,50%,0.2)]' 
              : 'bg-card/30 border-white/10 hover:border-white/30'
          }`}
          onClick={() => setSelectedPlan('monthly')}
          data-testid="card-monthly"
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className={selectedPlan === 'monthly' ? 'text-yellow-400' : ''}>Monthly</span>
              {selectedPlan === 'monthly' && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Selected</Badge>
              )}
            </CardTitle>
            <CardDescription>Flexible month-to-month billing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${monthlyPrice ? formatPrice(monthlyPrice.unitAmount) : '9.99'}
              <span className="text-lg text-muted-foreground font-normal">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Cancel anytime
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`relative cursor-pointer transition-all ${
            selectedPlan === 'yearly' 
              ? 'bg-black/40 border-yellow-500/50 shadow-[0_0_30px_hsl(45,100%,50%,0.2)]' 
              : 'bg-card/30 border-white/10 hover:border-white/30'
          }`}
          onClick={() => setSelectedPlan('yearly')}
          data-testid="card-yearly"
        >
          <div className="absolute top-0 right-0 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
            SAVE 33%
          </div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className={selectedPlan === 'yearly' ? 'text-yellow-400' : ''}>Yearly</span>
              {selectedPlan === 'yearly' && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Selected</Badge>
              )}
            </CardTitle>
            <CardDescription>Best value for committed members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${yearlyPrice ? formatPrice(yearlyPrice.unitAmount) : '79.99'}
              <span className="text-lg text-muted-foreground font-normal">/year</span>
            </div>
            <p className="text-sm text-green-400 mt-2">
              $6.67 USD/mo · Save $39.89 USD vs monthly
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/30 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">S-Class Membership</p>
              <p className="text-sm text-muted-foreground">
                {selectedPlan === 'yearly' ? 'Yearly subscription' : 'Monthly subscription'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">
                ${selectedPrice ? formatPrice(selectedPrice.unitAmount) : '--'}
              </p>
              <p className="text-sm text-muted-foreground">
                /{selectedPlan === 'yearly' ? 'year' : 'month'}
              </p>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>Taxes calculated at checkout based on your location</span>
          </div>

          <Separator className="bg-white/10" />

          <div className="border border-yellow-500/20 rounded-lg p-4 bg-black/20">
            <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Cancellation & Refund Policy
            </h4>
            <ul className="text-sm text-white/70 space-y-1.5 mb-4">
              <li>• Cancel anytime from Account → Subscription</li>
              <li>• After you cancel, S-Class stays active until the end of your current billing period</li>
              <li>• Your plan will not renew after the end date</li>
              <li>• No partial refunds or prorated refunds for unused time</li>
              <li>• Yearly subscriptions are not partially refunded once started</li>
              <li>• Refunds are only available for duplicate charges or billing errors</li>
            </ul>
            
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <Checkbox 
                id="terms-checkbox"
                checked={termsAcknowledged}
                onCheckedChange={(checked) => setTermsAcknowledged(checked === true)}
                className="mt-0.5 border-yellow-500/50 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                data-testid="checkbox-terms"
              />
              <label 
                htmlFor="terms-checkbox" 
                className="text-sm text-white cursor-pointer leading-relaxed"
              >
                I understand: cancel anytime, no partial refunds, access until end of term.
              </label>
            </div>
          </div>

          <Button 
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 text-lg shadow-[0_0_20px_hsl(45,100%,50%,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCheckout}
            disabled={!selectedPrice || !!checkoutLoading || !termsAcknowledged}
            data-testid="button-checkout"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Redirecting to payment...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5 mr-2" />
                Continue to Payment
              </>
            )}
          </Button>

          {!termsAcknowledged && (
            <p className="text-xs text-center text-yellow-400/70">
              Please acknowledge the cancellation policy to continue
            </p>
          )}

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Secure checkout</span>
            </div>
            <span>·</span>
            <span>Powered by Stripe</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/20 border-white/5">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">What's included:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              <span>6 Rewarded Game Runs per day (vs 3)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              <span>210 Token daily cap (vs 90)</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              <span>Extra weekly & monthly draw entries</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              <span>Higher card pull efficiency</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              <span>Exclusive S-Class golden badge</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              <span>Cancel anytime</span>
            </div>
          </div>

          <Separator className="my-4 bg-white/10" />

          <p className="text-xs text-muted-foreground italic">
            By subscribing, you acknowledge these terms. Rewards are digital items with no cash value.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
