import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Star, Minus, Trash2, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface AnimeData {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string };
  episodes: number | null;
  format: string;
  seasonYear: number | null;
  genres: string[];
  status: string;
}

interface WatchlistItem {
  id: string;
  userId: string;
  anilistId: number;
  status: string;
  progress: number;
  score: number | null;
  notes: string | null;
  anime: AnimeData | null;
}

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "WATCHING", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PLANNING", label: "Planning" },
  { value: "PAUSED", label: "Paused" },
  { value: "DROPPED", label: "Dropped" },
];

const STATUS_COLORS: Record<string, string> = {
  WATCHING: "bg-blue-500/20 text-blue-400",
  COMPLETED: "bg-green-500/20 text-green-400",
  PLANNING: "bg-yellow-500/20 text-yellow-400",
  PAUSED: "bg-orange-500/20 text-orange-400",
  DROPPED: "bg-red-500/20 text-red-400",
};

export default function AnimeListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: watchlist = [], isLoading } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "Removed from watchlist" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredWatchlist = watchlist.filter((item) => {
    if (activeTab !== "ALL" && item.status !== activeTab) return false;
    return true;
  });

  const handleProgressChange = (item: WatchlistItem, delta: number) => {
    const newProgress = Math.max(0, item.progress + delta);
    const maxEpisodes = item.anime?.episodes;
    if (maxEpisodes && newProgress > maxEpisodes) return;
    updateMutation.mutate({ id: item.id, updates: { progress: newProgress } });
  };

  const handleStatusChange = (item: WatchlistItem, status: string) => {
    updateMutation.mutate({ id: item.id, updates: { status } });
  };

  const handleScoreChange = (item: WatchlistItem, score: number | null) => {
    updateMutation.mutate({ id: item.id, updates: { score } });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please log in to view your watchlist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text mb-2" data-testid="text-page-title">MY WATCHLIST</h1>
          <p className="text-muted-foreground">Track your journey through the multiverse.</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-anime">
              <Plus className="mr-2 h-4 w-4" /> Add Anime
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Anime to Watchlist</DialogTitle>
            </DialogHeader>
            <AddAnimeSearch onClose={() => setIsAddModalOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/5 p-1 mb-6 flex-wrap h-auto">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={`flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary`}
              data-testid={`tab-${tab.value.toLowerCase()}`}
            >
              {tab.label}
              {tab.value !== "ALL" && (
                <span className="ml-1 text-xs opacity-60">
                  ({watchlist.filter((i) => i.status === tab.value).length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-muted-foreground">
            {activeTab === "ALL" 
              ? "Your watchlist is empty. Add some anime to get started!"
              : `No anime in ${activeTab.toLowerCase()} status.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWatchlist.map((item) => (
              <WatchlistCard
                key={item.id}
                item={item}
                onProgressChange={handleProgressChange}
                onStatusChange={handleStatusChange}
                onScoreChange={handleScoreChange}
                onDelete={() => deleteMutation.mutate(item.id)}
                isUpdating={updateMutation.isPending}
              />
            ))}
          </div>
        )}
      </Tabs>
    </div>
  );
}

function WatchlistCard({
  item,
  onProgressChange,
  onStatusChange,
  onScoreChange,
  onDelete,
  isUpdating,
}: {
  item: WatchlistItem;
  onProgressChange: (item: WatchlistItem, delta: number) => void;
  onStatusChange: (item: WatchlistItem, status: string) => void;
  onScoreChange: (item: WatchlistItem, score: number | null) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const anime = item.anime;
  const title = anime?.title.english || anime?.title.romaji || "Unknown Anime";
  const coverImage = anime?.coverImage.large || "https://via.placeholder.com/300x450";
  const totalEpisodes = anime?.episodes;
  const progressPercent = totalEpisodes ? (item.progress / totalEpisodes) * 100 : 0;

  return (
    <Card 
      className="bg-card/40 border-white/5 overflow-hidden hover:border-white/20 transition-all group"
      data-testid={`card-watchlist-${item.id}`}
    >
      <div className="flex h-44">
        <div className="w-28 h-full flex-shrink-0 relative">
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/90 md:hidden" />
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <h3 className="font-bold line-clamp-2 group-hover:text-primary transition-colors text-sm" data-testid={`text-anime-title-${item.id}`}>
              {title}
            </h3>
            <div className="flex gap-1 mt-1 flex-wrap">
              {anime?.genres?.slice(0, 2).map((genre) => (
                <Badge key={genre} variant="secondary" className="text-[9px] h-4 px-1">
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select
                value={item.status}
                onValueChange={(val) => onStatusChange(item, val)}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-7 text-xs w-full" data-testid={`select-status-${item.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_TABS.filter((t) => t.value !== "ALL").map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>
                      {tab.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onProgressChange(item, -1)}
                  disabled={item.progress <= 0 || isUpdating}
                  data-testid={`button-progress-minus-${item.id}`}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-mono text-white min-w-[60px] text-center" data-testid={`text-progress-${item.id}`}>
                  {item.progress}/{totalEpisodes || "?"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onProgressChange(item, 1)}
                  disabled={(totalEpisodes && item.progress >= totalEpisodes) || isUpdating}
                  data-testid={`button-progress-plus-${item.id}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <Select
                  value={item.score?.toString() || "none"}
                  onValueChange={(val) => onScoreChange(item, val === "none" ? null : parseInt(val))}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="h-6 w-14 text-xs" data-testid={`select-score-${item.id}`}>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {[...Array(11)].map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-400 hover:text-red-300"
                onClick={onDelete}
                data-testid={`button-delete-${item.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {item.status === "WATCHING" && totalEpisodes && (
        <div className="h-1 w-full bg-white/10">
          <div
            className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </Card>
  );
}

function AddAnimeSearch({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: searchResults = [], isLoading: isSearching } = useQuery<AnimeData[]>({
    queryKey: ["/api/anime/search", debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/anime/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const addMutation = useMutation({
    mutationFn: async ({ anilistId, status }: { anilistId: number; status: string }) => {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilistId, status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({ title: "Added to watchlist!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSearch = () => {
    setDebouncedQuery(searchQuery);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search anime..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          data-testid="input-anime-search"
        />
        <Button onClick={handleSearch} disabled={searchQuery.length < 2} data-testid="button-search">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {isSearching && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isSearching && searchResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
          {searchResults.map((anime) => (
            <div
              key={anime.id}
              className="relative group cursor-pointer"
              data-testid={`search-result-${anime.id}`}
            >
              <img
                src={anime.coverImage.large}
                alt={anime.title.romaji}
                className="w-full h-40 object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center p-2">
                <p className="text-xs text-center text-white mb-2 line-clamp-2">
                  {anime.title.english || anime.title.romaji}
                </p>
                <div className="flex flex-col gap-1 w-full">
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => addMutation.mutate({ anilistId: anime.id, status: "WATCHING" })}
                    disabled={addMutation.isPending}
                    data-testid={`button-add-watching-${anime.id}`}
                  >
                    + Watching
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-7 text-xs"
                    onClick={() => addMutation.mutate({ anilistId: anime.id, status: "PLANNING" })}
                    disabled={addMutation.isPending}
                    data-testid={`button-add-planning-${anime.id}`}
                  >
                    + Planning
                  </Button>
                </div>
              </div>
              <p className="text-xs mt-1 line-clamp-1 text-center">
                {anime.title.english || anime.title.romaji}
              </p>
            </div>
          ))}
        </div>
      )}

      {!isSearching && debouncedQuery.length >= 2 && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No anime found for "{debouncedQuery}"
        </div>
      )}
    </div>
  );
}
