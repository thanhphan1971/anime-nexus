import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Coins,
  Sparkles,
  Layers,
  ShoppingBag,
  ArrowRightLeft,
  Filter,
  Search,
  ShieldCheck,
  Gift,
  Star,
  Crown,
  Loader2,
  Book,
  Clock,
  Share2,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  useUserCards,
  useSummonCards,
  useSummonHistory,
  useMarketListings,
  usePurchaseListing,
  useFreeGachaStatus,
  useFreeSummon,
  useShareSummon,
} from "@/lib/api";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { format } from "date-fns";

const RARITY_FILTERS = ["All", "Common", "Rare", "Epic", "Legendary", "Mythic"] as const;

export default function CardsPage() {
  const { user, refreshUser } = useAuth();
  const { data: userCards, isLoading: cardsLoading } = useUserCards(user?.id);
  const queryClient = useQueryClient();
  const { data: marketListings, isLoading: marketLoading } = useMarketListings();
  const summonCards = useSummonCards();
  const { data: summonHistory = [], isLoading: isHistoryLoading } = useSummonHistory(10);
  const purchaseListing = usePurchaseListing();
  const { data: freeStatus, refetch: refetchFreeStatus } = useFreeGachaStatus();
  const freeSummonMutation = useFreeSummon();
  const shareSummon = useShareSummon();

  const [liveTokenBalance, setLiveTokenBalance] = useState<number | null>(null);
  const [summonError, setSummonError] = useState<string | null>(null);
  const [reward, setReward] = useState<any>(null);
  const [rarityFilter, setRarityFilter] = useState<string>("All");
  const [isFreeLoading, setIsFreeLoading] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareDismissed, setShareDismissed] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState("standard");

  const [, setLocation] = useLocation();
  const paidSummonRef = useRef<HTMLDivElement>(null);
  const freeSummonRef = useRef<HTMLDivElement>(null);
  const rewardSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");

    const scrollTimeout = setTimeout(() => {
      if (mode === "paid" && paidSummonRef.current) {
        paidSummonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (mode === "free" && freeSummonRef.current) {
        freeSummonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 500);

    return () => clearTimeout(scrollTimeout);
  }, []);

  const { data: banners } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await fetch("/api/banners");
      if (!res.ok) throw new Error("Failed to load banners");
      return res.json();
    },
  });

  const filteredCards = [...(userCards || [])]
  .filter((userCard: any) => {
    if (rarityFilter === "All") return true;
    return userCard.card.rarity === rarityFilter;
  })
  .sort((a: any, b: any) => {
    const dateA = new Date(a.acquiredAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.acquiredAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  

  const displayedTokens = liveTokenBalance !== null ? liveTokenBalance : user?.tokens ?? 0;

// =========================
// Collection / summon stats
// =========================
const rarityRank: Record<string, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Mythic: 5,
};

const rarityOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic"];

const historyEntries = Array.isArray(summonHistory) ? summonHistory : [];
const collectionEntries = Array.isArray(userCards) ? userCards : [];

const totalSummons = historyEntries.length;
const totalCollectionCards = collectionEntries.length;

const rarityCounts = historyEntries.reduce((acc: Record<string, number>, entry: any) => {
  const rarity = entry.rarity ?? entry.card?.rarity ?? "Common";
  acc[rarity] = (acc[rarity] || 0) + 1;
  return acc;
}, {});

const bestPull = historyEntries.reduce((best: string | null, entry: any) => {
  const rarity = entry.rarity ?? entry.card?.rarity ?? "Common";
  if (!best) return rarity;
  return rarityRank[rarity] > rarityRank[best] ? rarity : best;
}, null);

const bannerCounts = historyEntries.reduce((acc: Record<string, number>, entry: any) => {
  const banner = entry.banner || "Standard";
  acc[banner] = (acc[banner] || 0) + 1;
  return acc;
}, {});

const bannerBestPulls = historyEntries.reduce((acc: Record<string, string>, entry: any) => {
  const banner = entry.banner || "Standard";
  const rarity = entry.rarity ?? entry.card?.rarity ?? "Common";

  if (!acc[banner] || rarityRank[rarity] > rarityRank[acc[banner]]) {
    acc[banner] = rarity;
  }

  return acc;
}, {});

const bestBanner = Object.entries(bannerBestPulls).reduce(
  (best, [banner, rarity]) => {
    if (!best) return { banner, rarity };
    return rarityRank[rarity] > rarityRank[best.rarity] ? { banner, rarity } : best;
  },
  null as { banner: string; rarity: string } | null
);

const freeRareCount = historyEntries.filter((entry: any) => {
  const rarity = entry.rarity ?? entry.card?.rarity ?? "Common";
  return entry.source === "free_summon" && rarityRank[rarity] >= rarityRank["Rare"];
}).length;

const collectionRaritySet = new Set(
  collectionEntries.map((entry: any) => entry.card?.rarity).filter(Boolean)
);

const unlockedHigherTier = ["Rare", "Epic", "Legendary", "Mythic"].filter((rarity) =>
  collectionRaritySet.has(rarity)
);

const commonCount = rarityCounts["Common"] || 0;
const commonRate = totalSummons > 0 ? Math.round((commonCount / totalSummons) * 100) : 0;

const summaryLine =
  totalSummons === 0
    ? "Your collection journey hasn’t started yet. Your first pulls will begin shaping your rarity profile."
    : `Your collection is mostly ${commonCount > 0 ? "Common" : "higher-tier"} so far, but you've already unlocked ${unlockedHigherTier.length ? unlockedHigherTier.join(" and ") : "new rarity potential"}. ${
        bestBanner
          ? `${bestBanner.banner} delivered your strongest hit with a ${bestBanner.rarity}.`
          : "Each new banner gives you another chance to improve your best pull."
      } ${
        freeRareCount > 0
          ? `Even free summons have already produced ${freeRareCount} Rare+ pull${freeRareCount > 1 ? "s" : ""}.`
          : "Your next lucky streak could push the collection higher."
      }`;

const nextTargetRarity =
  !unlockedHigherTier.includes("Epic")
    ? "Epic"
    : !unlockedHigherTier.includes("Legendary")
    ? "Legendary"
    : !unlockedHigherTier.includes("Mythic")
    ? "Mythic"
    : null;

const pullsSinceLastRare = (() => {
  let count = 0;
  for (let i = historyEntries.length - 1; i >= 0; i--) {
    const rarity = historyEntries[i].rarity ?? historyEntries[i].card?.rarity ?? "Common";
    if (rarityRank[rarity] >= rarityRank["Rare"]) break;
    count++;
  }
  return count;
})();

const momentumMessage =
  pullsSinceLastRare >= 5
    ? "You're on a streak — your next Rare+ pull could be close."
    : null;

const bestBannerCTA =
  bestBanner && bestBanner.rarity !== "Common"
    ? `${bestBanner.banner} has been your strongest banner so far`
    : null;

const selectedBannerBestRarity = selectedBanner
  ? Object.entries(bannerBestPulls).find(
      ([bannerName]) =>
        bannerName.toLowerCase() === selectedBanner.toLowerCase()
    )?.[1] ?? null
  : null;

const selectedBannerMessage = selectedBannerBestRarity
  ? `Your best result on this banner so far is ${selectedBannerBestRarity}.`
  : "You have not landed a notable pull on this banner yet.";

const getResetTimeString = () => {
  if (!freeStatus?.nextResetAt) return "12:00 AM";
  try {
    return format(new Date(freeStatus.nextResetAt), "h:mm a");
  } catch {
    return "12:00 AM";
  }
};

const rarityTargets: Record<string, number> = {
  Rare: 5,
  Epic: 15,
  Legendary: 40,
  Mythic: 80,
};

const targetPulls = nextTargetRarity
  ? rarityTargets[nextTargetRarity] ?? 10
  : null;

const progressPercent =
  targetPulls && pullsSinceLastRare
    ? Math.min(100, Math.floor((pullsSinceLastRare / targetPulls) * 100))
    : 0;

const scrollToReward = () => {
  setTimeout(() => {
    rewardSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
};

  const handleFreeSummon = async () => {
    if (!user) {
      toast.error("Please sign in to summon");
      return;
    }

    if (!freeStatus || freeStatus.remainingToday <= 0) {
      toast.error("No free summons remaining today!");
      return;
    }

    setIsFreeLoading(true);

    try {
      const result = await freeSummonMutation.mutateAsync();
      setReward(result.card);
      setHasShared(false);
      setShareDismissed(false);

      await refetchFreeStatus();
      await refreshUser();

      toast.success(`Summoned ${result.card?.name || "a card"}!`);
      scrollToReward();
    } catch (error: any) {
      toast.error(error.message || "Summon failed");
    } finally {
      setIsFreeLoading(false);
    }
  };

  const handleSummon = async (count: 1 | 10 = 1) => {
  const cost = 100 * count;

  if (!user) {
    toast.error("Please sign in to summon");
    return;
  }

  if (displayedTokens < cost) {
    toast.error(`Insufficient tokens! Need ${cost} tokens to pull x${count}.`);
    return;
  }

  setSummonError(null);

  try {
    const summonPayload = {
      count,
      bannerKey: selectedBanner,
    };

    const result = await summonCards.mutateAsync(summonPayload as any);

    if (typeof result?.tokensRemaining === "number") {
      setLiveTokenBalance(result.tokensRemaining);
    } else {
      setLiveTokenBalance((prev) =>
        prev !== null ? prev - cost : (user?.tokens ?? 0) - cost
      );
    }

    setReward(result.cards ?? result.card ?? null);
    setHasShared(false);
    setShareDismissed(false);

    toast.success(
      `Pulled x${count}: received ${result.cards?.length || (result.card ? 1 : 0)} card(s)!`
    );
    scrollToReward();

    await refreshUser();
    await queryClient.invalidateQueries({ queryKey: ["userCards"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    await queryClient.invalidateQueries({ queryKey: ["summonHistory"] });

    await queryClient.refetchQueries({ queryKey: ["userCards"], type: "active" });
    await queryClient.refetchQueries({ queryKey: ["/api/auth/me"], type: "active" });
    await queryClient.refetchQueries({ queryKey: ["summonHistory"], type: "active" });

    if (result.showPaidSummonReminder) {
      setTimeout(() => {
        toast.info("You've summoned a lot today.\nFree daily summons reset at 7:00 PM.", {
          description: "Weekly and monthly draws are capped for fairness.",
          duration: 6000,
        });
      }, 1500);
    }
  } catch (error: any) {
    const message = error?.message || "Summon failed";
    setSummonError(message);
    toast.error(message);
  }
};

  const handleShareToFeed = async () => {
    if (!reward) return;

    const cards = Array.isArray(reward) ? reward : [reward];
    if (cards.length === 0) return;

    const card = cards[0];

    setIsSharing(true);
    try {
      await shareSummon.mutateAsync({
        cardId: card.id,
        source: "paid",
      });
      setHasShared(true);
      toast.success("Shared to Feed!");
    } catch (error: any) {
      toast.error(error.message || "Failed to share");
    } finally {
      setIsSharing(false);
    }
  };

  const handleBackToSummons = () => {
  setReward(null);
  setHasShared(false);
  setShareDismissed(false);
  setSummonError(null);

  setTimeout(() => {
    paidSummonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 100);
};

const handleDismissShare = () => {
  setShareDismissed(true);
};

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 z-10 flex flex-col items-start gap-4 rounded-xl border border-white/10 bg-card/30 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="neon-text font-display text-2xl font-bold">CARDS HUB</h1>
          <p className="max-w-[240px] text-xs text-muted-foreground">
            Summon rare anime cards, build your collection, and trade with others
          </p>
          
        </div>

        <Button
          size="default"
          onClick={() => setLocation("/cards/catalog")}
          data-testid="button-view-catalog"
          className="bg-gradient-to-r from-purple-600 to-cyan-500 text-base font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:from-purple-500 hover:to-cyan-400 hover:shadow-purple-500/50"
        >
          <Book className="mr-2 h-5 w-5" /> Catalog
        </Button>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 whitespace-nowrap"
            data-testid="text-tokens"
          >
            <Coins className="h-4 w-4 text-yellow-400" />
            <span className="font-mono font-bold text-yellow-400">{displayedTokens.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Current Balance</span>
          </div>

          {user?.isPremium && (
            <div className="flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-sm font-bold text-yellow-500">
              <Crown className="h-4 w-4" /> S-Class
            </div>
          )}
        </div>
      </div>

      {!user?.isPremium && (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-transparent p-3">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-yellow-400" />
            <p className="text-sm font-medium">
              <span className="font-bold text-yellow-400">Upgrade to S-Class</span> for 2x pulls + Luck Boost.
            </p>
          </div>
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setLocation("/sclass")}>
            View Perks
          </Button>
        </div>
      )}

      <Tabs defaultValue="summon" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4 border border-white/10 bg-card/50 p-1">
          <TabsTrigger value="summon">
            <Sparkles className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Summon</span>
          </TabsTrigger>
          <TabsTrigger value="collection">
            <Layers className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Collection</span>
          </TabsTrigger>
          <TabsTrigger value="market">
            <ShoppingBag className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Market</span>
          </TabsTrigger>
          <TabsTrigger value="offers">
            <ArrowRightLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Offers</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summon" className="space-y-6">

<div className="rounded-xl border border-white/10 bg-card/40 p-4 md:p-5">
  <div className="mb-4 flex items-center justify-between gap-3">
    <div>
      <h3 className="font-display text-lg font-bold text-white">Your Summon Story</h3>
      <p className="text-xs text-muted-foreground">
        Truthful stats, framed around progress and momentum
      </p>
    </div>

    <Badge variant="outline" className="border-primary/40 text-primary">
      {totalSummons} summon{totalSummons === 1 ? "" : "s"}
    </Badge>
  </div>

  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reality Stat</p>
      <p className="mt-2 text-2xl font-bold text-white">{commonRate}%</p>
      <p className="mt-1 text-sm text-muted-foreground">Common pulls</p>
    </div>

    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hope Stat</p>
      <p className="mt-2 text-2xl font-bold text-purple-300">{bestPull || "None yet"}</p>
      <p className="mt-1 text-sm text-muted-foreground">Best Pull Ever</p>
    </div>

    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Collection Value</p>
      <p className="mt-2 text-2xl font-bold text-white">
        {unlockedHigherTier.length ? unlockedHigherTier.join(", ") : "Common"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Higher-tier rarities unlocked</p>
    </div>

    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Strongest Banner</p>
      <p className="mt-2 text-2xl font-bold text-yellow-300">
        {bestBanner ? bestBanner.banner : "Not enough data"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {bestBanner ? `Top hit: ${bestBanner.rarity}` : "Pull more to compare banners"}
      </p>
      {bestBannerCTA && (
  <p className="mt-1 text-xs text-muted-foreground">
    {bestBannerCTA}
  </p>
)}
    </div>
  </div>

  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-muted-foreground">Rarest Pulls Unlocked</p>
      <p className="mt-1 font-semibold text-white">
        {rarityOrder
          .filter((rarity) => (rarityCounts[rarity] || 0) > 0 && rarityRank[rarity] >= rarityRank["Rare"])
          .map((rarity) => `${rarity} ×${rarityCounts[rarity]}`)
          .join(" • ") || "No Rare+ pulls yet"}
      </p>
    </div>

    

    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-muted-foreground">Banner Coverage</p>
      <p className="mt-1 font-semibold text-white">
        {Object.keys(bannerCounts).length > 0
          ? `You've pulled from ${Object.keys(bannerCounts).length} banner${
              Object.keys(bannerCounts).length > 1 ? "s" : ""
            }`
          : "No banner data yet"}
      </p>
    </div>

    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
  <p className="text-xs text-muted-foreground">Free Summon Wins</p>
  <p className="mt-1 font-semibold text-white">
    {freeRareCount > 0
      ? `Free summons already landed ${freeRareCount} Rare+ pull${freeRareCount > 1 ? "s" : ""}`
      : "No Rare+ free pulls yet"}
  </p>
</div>

<div className="rounded-lg border border-white/10 bg-black/20 p-3">
  <p className="text-xs text-muted-foreground">Collection Size</p>
  <p className="mt-1 font-semibold text-white">
    {totalCollectionCards} card{totalCollectionCards === 1 ? "" : "s"} collected
  </p>
</div>

</div>

<div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
  <p className="text-sm leading-6 text-white">
    {summaryLine}
  </p>

  {nextTargetRarity && (
    <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
      <p className="text-xs text-muted-foreground">Next Milestone</p>
      <p className="mt-1 font-semibold text-white">
        Your next big unlock: {nextTargetRarity}
      </p>
      <p className="text-xs text-muted-foreground">
  You're building toward higher-tier pulls with each summon
</p>

<div className="mt-2">
  <div className="h-2 w-full rounded-full bg-black/30">
    <div
      className="h-2 rounded-full bg-purple-500 transition-all"
      style={{ width: `${progressPercent}%` }}
    />
  </div>
  <p className="mt-1 text-xs text-muted-foreground">
    {progressPercent}% toward {nextTargetRarity}
  </p>
</div>
    </div>
  )}

    {momentumMessage && (
    <div className="mt-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
      <p className="text-sm font-semibold text-yellow-300">
        {momentumMessage}
      </p>
    </div>
  )}
</div>

<div className="mb-4 rounded-xl border border-white/10 bg-gradient-to-r from-purple-500/10 via-primary/10 to-cyan-500/10 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-primary">
              <Sparkles className="h-5 w-5" /> How Summoning Works
            </h3>

            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Spend <strong className="text-yellow-400">100 Tokens</strong> to summon a random anime card. The
                system will randomly select a card from one of the 5 rarity categories below. Higher rarities are
                harder to get but more valuable!
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="font-bold text-white">What You Win:</p>
                  <p className="text-muted-foreground">
                    <strong className="text-white">Free Users:</strong> 1 random card per summon
                  </p>
                  <p className="text-muted-foreground">
                    <strong className="text-yellow-400">S-Class Members:</strong> 2 random cards + higher luck for rare
                    drops
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-white">Card Rarities:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="border-gray-500 text-xs text-gray-400">
                      Common
                    </Badge>
                    <Badge variant="outline" className="border-blue-500 text-xs text-blue-400">
                      Rare
                    </Badge>
                    <Badge variant="outline" className="border-purple-500 text-xs text-purple-400">
                      Epic
                    </Badge>
                    <Badge variant="outline" className="border-yellow-500 text-xs text-yellow-400">
                      Legendary
                    </Badge>
                    <Badge variant="outline" className="border-pink-500 text-xs text-pink-400">
                      Mythic
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 border-t border-white/10 pt-3 text-xs text-muted-foreground">
              <strong className="text-white">What can you do with cards?</strong> Collect them and showcase your
              favorites on your profile. Build your deck and complete your collection!
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="mb-2 text-sm font-bold text-white">Free Daily Summon Rules:</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <span className="text-purple-400">•</span> Every account receives 1 free summon per day
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span> S-Class members receive 2 free summons per day
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span> Free summons can ONLY be used on the Standard Banner
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span> Standard Banner contains permanent, non-limited cards
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-pink-400">•</span> Event-limited and premium-only cards are excluded
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-pink-400">•</span> Free summons have lower rare drop rates than paid summons
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-gray-400">•</span> Free summons do not carry over if unused
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-gray-400">•</span> Daily reset occurs at 12:00 AM local time
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[400px] flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {!reward && !summonCards.isPending && !isFreeLoading && (
                <div className="w-full max-w-2xl space-y-6 text-center">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div
                      ref={freeSummonRef}
                      className="relative flex flex-col items-center rounded-xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-6"
                    >
                      <Gift className="mb-4 h-12 w-12 text-green-400" />
                      <p className="font-display text-xl font-bold text-green-400">FREE SUMMON</p>
                      <p className="mt-2 text-xs text-muted-foreground">Standard Banner</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.isPremium ? "2 daily summons" : "1 daily summon"}
                      </p>

                      {freeStatus && (
                        <div className="mt-4 flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1.5">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-bold text-white" data-testid="text-free-remaining">
                            {freeStatus.remainingToday} / {freeStatus.dailyFreeLimit}
                          </span>
                        </div>
                      )}

                      <Button
                        size="lg"
                        onClick={handleFreeSummon}
                        disabled={!freeStatus || freeStatus.remainingToday <= 0 || isFreeLoading}
                        className="mt-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 px-6 font-bold text-white hover:from-green-500 hover:to-emerald-500 disabled:opacity-50"
                        data-testid="button-free-summon"
                      >
                        <Gift className="mr-2 h-5 w-5" />
                        {isFreeLoading
                          ? "Summoning..."
                          : freeStatus && freeStatus.remainingToday > 0
                          ? "Free Summon"
                          : "No Summons Left"}
                      </Button>

                      {freeStatus && freeStatus.remainingToday <= 0 && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Resets at {getResetTimeString()}
                        </p>
                      )}
                    </div>

                    <div
                      ref={paidSummonRef}
                      className="relative flex flex-col items-center rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-6"
                    >
                      <Coins className="mb-4 h-12 w-12 text-yellow-400" />
                      <p className="font-display text-xl font-bold text-yellow-400">PAID SUMMON</p>
                      <p className="mt-2 text-xs text-muted-foreground">Cost: 100 Tokens</p>
                      <p className="text-xs text-muted-foreground">
                        {user?.isPremium ? "2x S-Class Pull" : "Single Pull"}
                      </p>

                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5">
                        <Coins className="h-4 w-4 text-yellow-400" />
                        <span className="font-mono font-bold text-yellow-400">
                          {displayedTokens.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">Current Balance</span>
                      </div>

                      <div className="mt-4 w-full">
  <p className="mb-1 text-xs text-muted-foreground">
    Choose a banner to summon from
  </p>
  <p className="mb-2 text-[11px] text-muted-foreground">
    You have 2 banner choices. Pick one, then choose how many pulls you want.
  </p>

  <div className="flex gap-2">
    {banners?.map((banner: any) => (
      <button
        key={banner.key}
        onClick={() => setSelectedBanner(banner.key)}
        className={`rounded-md border px-3 py-2 text-sm transition ${
          selectedBanner === banner.key
            ? "border-yellow-400 bg-yellow-500 text-black"
            : "border-white/10 bg-black/30 text-white hover:border-yellow-500/50"
        }`}
      >
        <div className="flex flex-col items-start">
  <span className="font-semibold">{banner.name}</span>

  <span
  className={`text-[10px] ${
  selectedBanner === banner.key ? "text-black/80" : "text-muted-foreground"
}`}
>
    {banner.key === "standard"
      ? "Balanced pulls • Build your collection"
      : "Limited event • Higher chance for powerful cards"}
  </span>
</div>
      </button>
    ))}
  </div>
</div>

<p className="mt-3 text-center text-[11px] text-muted-foreground">
  Try your luck
</p>

<div className="mt-4 w-full space-y-2">
  <Button
    size="lg"
    onClick={() => handleSummon(10)}
    disabled={summonCards.isPending || displayedTokens < 1000}
    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 py-6 text-lg font-bold text-black shadow-lg hover:from-yellow-400 hover:to-amber-400"
    data-testid="button-paid-summon-10"
  >
    <Sparkles className="mr-2 h-5 w-5" />
    {summonCards.isPending ? "Summoning..." : "Click here for 10 pulls (1000 Tokens)"}
  </Button>

  <p className="text-center text-[11px] text-muted-foreground">
    Best value • Faster opening
  </p>

  <Button
    variant="outline"
    size="sm"
    onClick={() => handleSummon(1)}
    disabled={summonCards.isPending || displayedTokens < 100}
    className="w-full border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
    data-testid="button-paid-summon-1"
  >
    <Sparkles className="mr-2 h-5 w-5" />
    {summonCards.isPending ? "Summoning..." : "Click here for 1 pull (100 Tokens)"}
  </Button>
</div>

<div className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 p-4">
  <p className="mb-2 text-xs text-muted-foreground">Your Banner Performance</p>

  {bestBannerCTA ? (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
      <p className="text-xs text-muted-foreground">Strongest Banner</p>
      <p className="mt-1 text-sm font-semibold text-yellow-300">
        {bestBannerCTA}
      </p>
    </div>
  ) : (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="text-xs text-muted-foreground">Strongest Banner</p>
      <p className="mt-1 text-sm text-muted-foreground">
        No banner leader yet — your next pull could change that.
      </p>
    </div>
  )}

  <div className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
    <p className="text-xs text-muted-foreground">Current Banner Performance</p>
    <p className="mt-1 text-sm font-medium text-cyan-200">
      {selectedBannerBestRarity
        ? `Your best pull on this banner so far is ${selectedBannerBestRarity}.`
        : "You have not landed a notable pull on this banner yet."}
    </p>
  </div>
</div>

{summonError && (
  <div className="mb-3 mt-4 w-full rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
    {summonError}
  </div>
)}

                     

                      {displayedTokens < 100 && (
                        <p className="mt-2 text-xs text-red-400">Not enough tokens</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(summonCards.isPending || isFreeLoading) && (
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1.5, rotate: 360 }}
                  exit={{ scale: 2, opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <div className="h-40 w-40 animate-spin rounded-full border-4 border-primary border-t-transparent blur-sm" />
                </motion.div>
              )}

              {reward && (
                <div ref={rewardSectionRef} className="w-full">
                  <motion.div
                    initial={{ scale: 0, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-full space-y-6 text-center"
                  >
                    <h3 className="font-display text-xl font-bold text-primary">
                      {Array.isArray(reward)
                        ? `You received ${reward.length} card${reward.length > 1 ? "s" : ""}!`
                        : "You received a card!"}
                    </h3>

                    <div
                      className={`flex justify-center gap-4 ${
                        Array.isArray(reward) && reward.length > 1 ? "flex-wrap" : ""
                      }`}
                    >
                      {(Array.isArray(reward) ? reward : [reward]).map((card: any, index: number) => (
                        <div
                          key={card?.id || index}
                          className="relative aspect-[3/4] w-56 overflow-hidden rounded-xl border-4 border-yellow-500 shadow-[0_0_50px_hsl(45,100%,50%,0.5)]"
                        >
                          <img src={card?.image} alt={card?.name} className="h-full w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-3 text-white">
                            <Badge className="mb-1 bg-yellow-500 text-xs text-black">{card?.rarity}</Badge>
                            <h2 className="text-sm font-bold">{card?.name}</h2>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!shareDismissed && (
                      <div className="mx-auto max-w-sm rounded-xl border border-white/10 bg-card/60 p-4">
                        {hasShared ? (
                          <div className="flex items-center justify-center gap-2 font-medium text-green-400">
                            <Check className="h-5 w-5" />
                            Shared to Feed!
                          </div>
                        ) : (
                          <>
                            <p className="mb-2 text-center text-xs text-muted-foreground">Share your pull?</p>
                            <div className="flex justify-center gap-3">
                              <Button
                                onClick={handleShareToFeed}
                                disabled={isSharing}
                                className="bg-gradient-to-r from-cyan-600 to-purple-600 font-bold text-white hover:from-cyan-500 hover:to-purple-500"
                                data-testid="button-share-to-feed"
                              >
                                {isSharing ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Share2 className="mr-2 h-4 w-4" />
                                )}
                                Share to Feed
                              </Button>

                              <Button
                                variant="ghost"
                                onClick={handleDismissShare}
                                className="text-muted-foreground hover:text-white"
                                data-testid="button-not-now"
                              >
                                Not now
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <Button
                      size="lg"
                      onClick={handleBackToSummons}
                      className="bg-gradient-to-r from-purple-600 to-cyan-600 px-8 font-bold text-white hover:from-purple-500 hover:to-cyan-500"
                      data-testid="button-back-to-summons"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Back to Summons
                    </Button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 rounded-xl border border-white/10 p-4">
            <h3 className="mb-4 text-lg font-bold">Recent Summons</h3>

            {isHistoryLoading ? (
              <div className="text-sm text-muted-foreground">Loading history...</div>
            ) : summonHistory.length ? (
              <div className="space-y-3">
  {summonHistory.map((entry: any, index: number) => {
                  const rarity = entry.rarity ?? entry.card?.rarity ?? "Unknown";
                  const rarityClass =
                    rarity === "Mythic"
                      ? "border-pink-500/40"
                      : rarity === "Legendary"
                      ? "border-yellow-500/40"
                      : rarity === "Epic"
                      ? "border-purple-500/40"
                      : rarity === "Rare"
                      ? "border-blue-500/40"
                      : "border-white/10";

const imageSrc = entry.cardImage ?? entry.card?.image ?? entry.image ?? null;
const isLatest = index === 0;                

return (
  <div
  key={entry.id}
  className={`flex items-center justify-between rounded-lg border p-3 transition-all hover:scale-[1.01] hover:bg-white/5 ${
  isLatest ? "bg-white/5 shadow-md" : ""
} ${rarityClass}`}
>
    <div className="flex items-center gap-3">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={entry.cardName ?? entry.card?.name ?? `Card #${entry.cardId}`}
          className="h-12 w-10 rounded border border-white/10 object-cover"
        />
      ) : (
        <div className="h-12 w-10 rounded border border-white/10 bg-white/5" />
      )}

      <div>
        <div
  className={`font-medium ${
    rarity === "Mythic"
      ? "text-pink-400"
      : rarity === "Legendary"
      ? "text-yellow-400"
      : rarity === "Epic"
      ? "text-purple-400"
      : rarity === "Rare"
      ? "text-blue-400"
      : "text-white"
  }`}
>
  {entry.cardName ?? entry.card?.name ?? `Card #${entry.cardId}`}
</div>
{isLatest && (
  <div className="mt-1">
    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
      Latest
    </span>
  </div>
)}
        
        <div className="text-xs text-muted-foreground">
  <span className="capitalize">{rarity}</span> •{" "}
  <span
    className={
      entry.source === "free_summon"
        ? "text-green-400"
        : "text-yellow-400"
    }
  >
    {entry.source === "free_summon" ? "Free" : "Paid"}
  </span>{" "}
  • {entry.banner || "Standard"}
</div>
      </div>
    </div>

    <div className="text-right text-xs text-muted-foreground">
  <div>{entry.costTokens ?? 0} tokens</div>
  <div>
    {entry.acquiredAt
      ? format(new Date(entry.acquiredAt), "MMM d, h:mm a")
      : "Unknown"}
  </div>
</div>
  </div>
);
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No summon history yet.</div>
            )}
          </div>
        </div>
        </TabsContent>

        <TabsContent value="collection" className="space-y-6">
          <div className="mb-4 border-b border-white/10 pb-4 text-center">
            <p className="text-sm text-muted-foreground">
              View all the anime cards you've collected through summoning and trading
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {RARITY_FILTERS.map((filter) => (
              <Badge
                key={filter}
                variant="outline"
                className={`cursor-pointer transition-all ${
                  rarityFilter === filter
                    ? "border-primary bg-primary text-white"
                    : "hover:border-primary/50 hover:bg-primary/20"
                }`}
                onClick={() => setRarityFilter(filter)}
                data-testid={`filter-${filter.toLowerCase()}`}
              >
                {filter}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {cardsLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCards && filteredCards.length > 0 ? (
              filteredCards.map((userCard: any) => (
                <Card
                  key={userCard.id}
                  className="group cursor-pointer overflow-hidden border-white/10 bg-card/40 transition-all hover:border-primary/50"
                >
                  <div className="relative aspect-[3/4]">
                    <img src={userCard.card.image} className="h-full w-full object-cover" />
                    <Badge className="absolute top-2 right-2 border-white/10 bg-black/60 backdrop-blur-md">
                      {userCard.card.rarity}
                    </Badge>
                  </div>
                  <CardFooter className="justify-center p-2 text-xs font-bold">{userCard.card.name}</CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <Layers className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No cards yet. Try summoning some!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <div className="mb-4 border-b border-white/10 pb-4 text-center">
            <p className="text-sm text-muted-foreground">
              Buy and sell cards with other players using your tokens
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search market..." className="bg-card/40 pl-9" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {marketLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : marketListings && marketListings.length > 0 ? (
              marketListings.map((listing: any) => (
                <Card key={listing.id} className="flex overflow-hidden border-white/10 bg-card/40">
                  <div className="relative w-24">
                    <img src={listing.card?.image} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <div>
                      <h4 className="text-sm font-bold">{listing.card?.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-green-400" /> {listing.seller?.name || "Unknown"}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {listing.price} Tokens
                      </Badge>

                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            await purchaseListing.mutateAsync(listing.id);
                            toast.success("Card purchased!");
                            await refreshUser();
                          } catch (error: any) {
                            toast.error(error.message || "Purchase failed");
                          }
                        }}
                        disabled={purchaseListing.isPending}
                      >
                        Buy
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <ShoppingBag className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No listings yet. Be the first to sell!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="offers">
          <div className="mb-4 border-b border-white/10 pb-4 text-center">
            <p className="text-sm text-muted-foreground">
              View and manage trade offers from other players
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-white/10 bg-card/20 py-12 text-center">
            <ArrowRightLeft className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-bold">No Active Offers</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              You don't have any incoming trade requests or active offers right now.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}