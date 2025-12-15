import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Book, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, Clock, Star, Zap, Loader2 } from "lucide-react";

type CardData = {
  id: string;
  name: string;
  character: string;
  anime: string;
  rarity: string;
  image: string;
  power: number;
  element: string;
  isLimited: boolean;
  obtainableFrom: string[];
  season: string | null;
  lore: string | null;
  releaseDate: string;
  createdAt: string;
};

type CatalogResponse = {
  cards: CardData[];
  total: number;
  page: number;
  totalPages: number;
};

const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];

const rarityColors: Record<string, string> = {
  Common: 'border-gray-500 text-gray-400 bg-gray-500/10',
  Rare: 'border-blue-500 text-blue-400 bg-blue-500/10',
  Epic: 'border-purple-500 text-purple-400 bg-purple-500/10',
  Legendary: 'border-yellow-500 text-yellow-400 bg-yellow-500/10',
  Mythic: 'border-pink-500 text-pink-400 bg-pink-500/10',
};

const rarityGlow: Record<string, string> = {
  Common: '',
  Rare: 'shadow-blue-500/20',
  Epic: 'shadow-purple-500/30',
  Legendary: 'shadow-yellow-500/40',
  Mythic: 'shadow-pink-500/50 animate-pulse',
};

export default function CardCatalogPage() {
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  const raritiesParam = selectedRarities.length > 0 ? selectedRarities.join(',') : '';

  const { data, isLoading } = useQuery<CatalogResponse>({
    queryKey: ['/api/cards/catalog', page, sortOrder, raritiesParam],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sort: sortOrder,
      });
      if (raritiesParam) params.set('rarities', raritiesParam);
      const res = await fetch(`/api/cards/catalog?${params}`);
      if (!res.ok) throw new Error('Failed to fetch cards');
      return res.json();
    },
  });
  
  const selectedCard = selectedCardIndex !== null && data?.cards ? data.cards[selectedCardIndex] : null;
  
  const goToPreviousCard = () => {
    if (selectedCardIndex !== null && selectedCardIndex > 0) {
      setSelectedCardIndex(selectedCardIndex - 1);
    }
  };
  
  const goToNextCard = () => {
    if (selectedCardIndex !== null && data?.cards && selectedCardIndex < data.cards.length - 1) {
      setSelectedCardIndex(selectedCardIndex + 1);
    }
  };
  
  const openCardDetail = (index: number) => {
    setSelectedCardIndex(index);
  };
  
  const closeCardDetail = () => {
    setSelectedCardIndex(null);
  };

  const toggleRarity = (rarity: string) => {
    setSelectedRarities(prev =>
      prev.includes(rarity) ? prev.filter(r => r !== rarity) : [...prev, rarity]
    );
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getObtainableText = (sources: string[]) => {
    const sourceLabels: Record<string, string> = {
      daily: 'Daily Gacha',
      weekly: 'Weekly Draw',
      monthly: 'Monthly Draw',
      event: 'Special Event',
    };
    return sources.map(s => sourceLabels[s] || s).join(', ');
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/30 p-4 rounded-xl border border-white/10 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-display font-bold neon-text flex items-center gap-2">
            <Book className="h-6 w-6" /> CARD CATALOG
          </h1>
          <p className="text-xs text-muted-foreground">
            Browse all {data?.total || 0} cards in the game
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'border-primary text-primary' : ''}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-1" /> Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
              setPage(1);
            }}
            data-testid="button-toggle-sort"
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-card/50 border border-white/10 rounded-lg p-4">
          <p className="text-sm font-medium mb-3">Filter by Rarity</p>
          <div className="flex flex-wrap gap-2">
            {RARITIES.map(rarity => (
              <label
                key={rarity}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                  selectedRarities.includes(rarity)
                    ? rarityColors[rarity]
                    : 'border-white/20 text-muted-foreground hover:border-white/40'
                }`}
                data-testid={`filter-rarity-${rarity.toLowerCase()}`}
              >
                <Checkbox
                  checked={selectedRarities.includes(rarity)}
                  onCheckedChange={() => toggleRarity(rarity)}
                  className="hidden"
                />
                <span className="text-sm">{rarity}</span>
              </label>
            ))}
            {selectedRarities.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRarities([]);
                  setPage(1);
                }}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : data?.cards.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No cards found matching your filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data?.cards.map((card, index) => (
              <Card
                key={card.id}
                className={`group cursor-pointer hover:scale-105 transition-all duration-200 bg-card/50 border-white/10 hover:border-white/30 shadow-lg ${rarityGlow[card.rarity]}`}
                onClick={() => openCardDetail(index)}
                data-testid={`card-catalog-item-${card.id}`}
              >
                <CardContent className="p-3">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-gradient-to-br from-white/5 to-white/0">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {card.isLimited && (
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-orange-500/90 text-white text-[10px] px-1.5">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Limited
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1">
                      <Badge className={`text-[10px] px-1.5 ${rarityColors[card.rarity]}`}>
                        {card.rarity}
                      </Badge>
                    </div>
                  </div>
                  <p className="font-medium text-sm truncate" data-testid={`text-card-name-${card.id}`}>
                    {card.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{card.anime}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedCard} onOpenChange={() => closeCardDetail()}>
        <DialogContent className="max-w-lg bg-card border-white/10">
          {selectedCard && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCard.name}
                  <Badge className={rarityColors[selectedCard.rarity]}>{selectedCard.rarity}</Badge>
                  {selectedCard.isLimited && (
                    <Badge className="bg-orange-500/90 text-white">
                      <Sparkles className="h-3 w-3 mr-1" /> Limited
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-[3/4] max-h-64 w-auto mx-auto rounded-lg overflow-hidden bg-gradient-to-br from-white/5 to-white/0">
                  <img
                    src={selectedCard.image}
                    alt={selectedCard.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Character</p>
                    <p className="font-medium">{selectedCard.character}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Anime</p>
                    <p className="font-medium">{selectedCard.anime}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Power
                    </p>
                    <p className="font-medium text-primary">{selectedCard.power}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <Star className="h-3 w-3" /> Element
                    </p>
                    <p className="font-medium">{selectedCard.element}</p>
                  </div>
                </div>
                {selectedCard.lore && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Lore</p>
                    <p className="text-sm italic text-white/80">{selectedCard.lore}</p>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Released: {formatDate(selectedCard.releaseDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    Obtainable from: {getObtainableText(selectedCard.obtainableFrom || ['daily'])}
                  </div>
                  {selectedCard.season && (
                    <div className="flex items-center gap-2">
                      <Star className="h-3 w-3" />
                      Season: {selectedCard.season}
                    </div>
                  )}
                </div>
                
                {/* Navigation buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousCard}
                    disabled={selectedCardIndex === 0}
                    data-testid="button-prev-card"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {selectedCardIndex !== null ? selectedCardIndex + 1 : 0} / {data?.cards.length || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextCard}
                    disabled={selectedCardIndex === (data?.cards.length || 1) - 1}
                    data-testid="button-next-card"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
