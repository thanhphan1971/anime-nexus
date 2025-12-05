import { Users, MessageSquare, Hash, Flame, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

const COMMUNITIES = [
  {
    id: "c1",
    name: "Attack on Titan HQ",
    members: "12.5k",
    active: "1.2k",
    category: "Shonen",
    description: "Dedicated to the Survey Corps. Shinzo wo Sasageyo! ⚔️",
    image: "https://picsum.photos/seed/aot/400/200",
    tags: ["Theories", "Manga", "Anime"],
  },
  {
    id: "c2",
    name: "One Piece Global",
    members: "45.2k",
    active: "3.8k",
    category: "Adventure",
    description: "The search for the One Piece starts here. Nakama forever! 🏴‍☠️",
    image: "https://picsum.photos/seed/op/400/200",
    tags: ["Spoilers", "Art", "Cosplay"],
  },
  {
    id: "c3",
    name: "Jujutsu Kaisen Sorcerers",
    members: "28k",
    active: "2.1k",
    category: "Supernatural",
    description: "Domain Expansion: Infinite Chat. Discuss the latest chapters.",
    image: "https://picsum.photos/seed/jjk/400/200",
    tags: ["Leaks", "Power Scaling"],
  },
  {
    id: "c4",
    name: "Ghibli Cozy Corner",
    members: "8.9k",
    active: "450",
    category: "Slice of Life",
    description: "Relaxing vibes, lofi beats, and appreciation for Miyazaki's art.",
    image: "https://picsum.photos/seed/ghibli/400/200",
    tags: ["Art", "Music", "Vibes"],
  },
];

export default function CommunitiesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text mb-2">COMMUNITIES</h1>
          <p className="text-muted-foreground">Join a room. Find your squad. Discuss the latest arcs.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <Input placeholder="Search communities..." className="bg-card/50 border-white/10" />
           <Button>Search</Button>
        </div>
      </div>

      {/* Categories / Trending */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {["Trending 🔥", "New ✨", "Shonen ⚔️", "Romance 💖", "Mecha 🤖", "Isekai 🌀"].map((cat) => (
          <Badge key={cat} variant="secondary" className="px-4 py-2 text-sm cursor-pointer hover:bg-primary hover:text-white transition-colors whitespace-nowrap">
            {cat}
          </Badge>
        ))}
      </div>

      {/* Community Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {COMMUNITIES.map((community) => (
          <Card key={community.id} className="bg-card/40 backdrop-blur-sm border-white/5 overflow-hidden hover:border-primary/50 transition-colors group">
            <div className="h-32 w-full bg-muted relative">
               <img src={community.image} alt={community.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
               <div className="absolute inset-0 bg-black/40" />
               <div className="absolute top-4 right-4">
                 <Badge className="bg-black/60 backdrop-blur-md border-white/10 hover:bg-black/80">
                   {community.category}
                 </Badge>
               </div>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{community.name}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> {community.active} Online</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {community.members}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {community.description}
              </p>
              <div className="flex gap-2">
                {community.tags.map(tag => (
                  <span key={tag} className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded">#{tag}</span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Link href={`/community/${community.id}`}>
                <Button className="w-full bg-white/5 hover:bg-primary hover:text-white border border-white/10">
                  Enter Room <MessageSquare className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
