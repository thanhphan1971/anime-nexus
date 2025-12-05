import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, CheckCircle, Clock, Plus, Star } from "lucide-react";

const ANIME_LIST = [
  {
    id: 1,
    title: "Cyberpunk: Edgerunners",
    episodes: "10/10",
    score: 9.8,
    status: "completed",
    image: "https://picsum.photos/seed/cyber/300/450",
    tags: ["Sci-Fi", "Action"]
  },
  {
    id: 2,
    title: "Frieren: Beyond Journey's End",
    episodes: "18/28",
    score: 9.5,
    status: "watching",
    image: "https://picsum.photos/seed/frieren/300/450",
    tags: ["Fantasy", "Adventure"]
  },
  {
    id: 3,
    title: "Solo Leveling",
    episodes: "5/12",
    score: 8.9,
    status: "watching",
    image: "https://picsum.photos/seed/solo/300/450",
    tags: ["Action", "Fantasy"]
  },
  {
    id: 4,
    title: "Kaiju No. 8",
    episodes: "0/12",
    score: "-",
    status: "plan_to_watch",
    image: "https://picsum.photos/seed/kaiju/300/450",
    tags: ["Sci-Fi", "Monsters"]
  },
  {
    id: 5,
    title: "Demon Slayer: Hashira Training",
    episodes: "0/?",
    score: "-",
    status: "plan_to_watch",
    image: "https://picsum.photos/seed/demon/300/450",
    tags: ["Action", "Historical"]
  }
];

export default function AnimeListPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text mb-2">MY WATCHLIST</h1>
          <p className="text-muted-foreground">Track your journey through the multiverse.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Anime
        </Button>
      </div>

      <Tabs defaultValue="watching" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/5 p-1 mb-6">
          <TabsTrigger value="watching" className="flex-1 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Watching
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Completed
          </TabsTrigger>
          <TabsTrigger value="plan_to_watch" className="flex-1 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
            Plan to Watch
          </TabsTrigger>
        </TabsList>

        {["watching", "completed", "plan_to_watch"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ANIME_LIST.filter(a => a.status === status).map((anime) => (
                <Card key={anime.id} className="bg-card/40 border-white/5 overflow-hidden hover:border-white/20 transition-all group">
                  <div className="flex h-40">
                    <div className="w-28 h-full flex-shrink-0 relative">
                      <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/90 md:hidden" />
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold line-clamp-1 group-hover:text-primary transition-colors">{anime.title}</h3>
                        <div className="flex gap-2 mt-2">
                          {anime.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] h-5 px-1">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end mt-2">
                        <div className="text-sm text-muted-foreground">
                          <span className="text-white font-mono font-bold">{anime.episodes}</span> Eps
                        </div>
                        {anime.score !== "-" && (
                          <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                            <Star className="h-3 w-3 fill-current" /> {anime.score}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar for Watching */}
                  {status === "watching" && (
                    <div className="h-1 w-full bg-white/10">
                      <div 
                        className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" 
                        style={{ width: `${(parseInt(anime.episodes.split('/')[0]) / parseInt(anime.episodes.split('/')[1])) * 100}%` }} 
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
            {ANIME_LIST.filter(a => a.status === status).length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-xl text-muted-foreground">
                No anime found in this list.
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
