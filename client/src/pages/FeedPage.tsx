import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Sparkles, Loader2, Trophy, Clock, Gift, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { usePosts, useLikePost } from "@/lib/api";
import { useLocation } from "wouter";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";

export default function FeedPage() {
  const { data: posts, isLoading } = usePosts();
  const likePost = useLikePost();
  const [, setLocation] = useLocation();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  
  // Initialize liked state from server data
  useEffect(() => {
    if (posts) {
      const likedIds = new Set<string>();
      const counts: Record<string, number> = {};
      posts.forEach((post: any) => {
        if (post.likedByCurrentUser) {
          likedIds.add(post.id);
        }
        counts[post.id] = post.likes;
      });
      setLikedPosts(likedIds);
      setLikeCounts(counts);
    }
  }, [posts]);
  
  const mockFeaturedDraw = {
    name: "WEEKLY DRAW",
    prize: "Legendary Card Pack + 5000 Tokens",
    endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  };
  
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const drawDate = new Date(mockFeaturedDraw.endAt);
    
    const updateTimer = () => {
      const now = new Date();
      const diffSeconds = differenceInSeconds(drawDate, now);
      if (diffSeconds > 0) {
        const days = Math.floor(diffSeconds / 86400);
        const hours = Math.floor((diffSeconds % 86400) / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLike = (postId: string) => {
    // Prevent double-clicks
    if (pendingLikes.has(postId)) return;
    
    const isCurrentlyLiked = likedPosts.has(postId);
    const currentLikes = likeCounts[postId] ?? 0;
    
    // Mark as pending
    setPendingLikes(prev => new Set(prev).add(postId));
    
    // Optimistic update
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyLiked) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
    
    setLikeCounts(prev => ({
      ...prev,
      [postId]: isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
    }));
    
    likePost.mutate(postId, {
      onSuccess: (data: { liked: boolean; likeCount: number }) => {
        // Sync with server response
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (data.liked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        setLikeCounts(prev => ({
          ...prev,
          [postId]: data.likeCount
        }));
      },
      onError: () => {
        // Revert on error
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyLiked) {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        setLikeCounts(prev => ({
          ...prev,
          [postId]: currentLikes
        }));
      },
      onSettled: () => {
        // Remove from pending
        setPendingLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="text-center pb-2">
        <h1 className="text-2xl font-display font-bold neon-text">HOME</h1>
        <p className="text-sm text-muted-foreground">Share your thoughts, discover posts, and connect with the anime community</p>
      </div>

      {/* Stories / Status Bar */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide mask-fade-right">
        <div className="flex flex-col items-center space-y-2 min-w-[80px]">
          <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] cursor-pointer hover:scale-105 transition-transform">
            <div className="h-full w-full rounded-full bg-card border-2 border-background flex items-center justify-center">
               <span className="text-2xl">+</span>
            </div>
          </div>
          <span className="text-xs font-medium">Add Story</span>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center space-y-2 min-w-[80px]">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary via-purple-500 to-secondary p-[2px] cursor-pointer hover:scale-105 transition-transform">
              <div className="h-full w-full rounded-full bg-card border-2 border-background overflow-hidden">
                 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="avatar" className="h-full w-full object-cover" />
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground">User {i}</span>
          </div>
        ))}
      </div>

      {/* Featured Draw Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card 
          className="relative overflow-hidden border-yellow-500/50 bg-gradient-to-r from-yellow-950/40 via-purple-950/40 to-cyan-950/40 cursor-pointer hover:border-yellow-400 transition-all"
          onClick={() => setLocation("/draws")}
          data-testid="banner-featured-draw"
        >
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full" />
          
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-[8px] font-bold text-white">!</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-yellow-400">{mockFeaturedDraw.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold uppercase">Live</span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Gift className="h-3 w-3 text-purple-400" />
                    {mockFeaturedDraw.prize}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" /> Ends in
                  </p>
                  <div className="flex gap-1">
                    {[
                      { value: timeLeft.days, label: "D" },
                      { value: timeLeft.hours, label: "H" },
                      { value: timeLeft.minutes, label: "M" },
                      { value: timeLeft.seconds, label: "S" },
                    ].map((unit, i) => (
                      <div key={i} className="bg-black/40 px-1.5 py-0.5 rounded text-center min-w-[28px]">
                        <span className="text-sm font-mono font-bold text-yellow-400">{String(unit.value).padStart(2, '0')}</span>
                        <span className="text-[8px] text-muted-foreground ml-0.5">{unit.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Winners Ticker */}
      <Card className="bg-yellow-950/20 border-yellow-500/30 overflow-hidden" data-testid="winners-ticker">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-yellow-400 shrink-0">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-bold uppercase">Winners</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-6 animate-marquee">
                {[
                  { name: "NeoKai", prize: "Legendary Pack", time: "2h ago" },
                  { name: "Sakura", prize: "5000 Tokens", time: "5h ago" },
                  { name: "Shadow", prize: "30 Days Premium", time: "1d ago" },
                  { name: "Ryu", prize: "Epic Badge", time: "2d ago" },
                  { name: "Miko", prize: "Avatar Frame", time: "3d ago" },
                  { name: "NeoKai", prize: "Legendary Pack", time: "2h ago" },
                  { name: "Sakura", prize: "5000 Tokens", time: "5h ago" },
                  { name: "Shadow", prize: "30 Days Premium", time: "1d ago" },
                  { name: "Ryu", prize: "Epic Badge", time: "2d ago" },
                  { name: "Miko", prize: "Avatar Frame", time: "3d ago" },
                ].map((winner, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-white">{winner.name}</span>
                    <span className="text-xs text-purple-400">won</span>
                    <span className="text-xs text-yellow-300 font-medium">{winner.prize}</span>
                    <span className="text-[10px] text-muted-foreground">• {winner.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-yellow-400 hover:bg-yellow-500/10 shrink-0 text-xs"
              onClick={() => setLocation("/draws")}
              data-testid="button-view-all-winners"
            >
              View All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Assistant Prompt */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="text-primary h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">AI Assistant</p>
            <p className="text-xs text-muted-foreground">"How about sharing your latest fan theory?"</p>
          </div>
          <Button 
            size="sm" 
            variant="secondary" 
            className="bg-primary/20 hover:bg-primary/30 text-primary border-none"
            onClick={() => setLocation("/create")}
            data-testid="button-create-post"
          >
            Create
          </Button>
        </CardContent>
      </Card>

      {/* Feed Posts */}
      <div className="space-y-6">
        {!posts || posts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
            <Button 
              className="mt-4" 
              onClick={() => setLocation("/create")}
              data-testid="button-create-first-post"
            >
              Create Post
            </Button>
          </Card>
        ) : (
          posts.map((post: any, index: number) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-white/10 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar>
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-sm hover:text-primary cursor-pointer transition-colors" data-testid={`text-username-${post.id}`}>{post.user.name}</p>
                  <p className="text-xs text-muted-foreground">{post.user.handle} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-0">
                {post.content && (
                  <div className="px-4 pb-3 text-sm leading-relaxed">
                    {post.content}
                  </div>
                )}
                {post.image && (
                  <div className="relative aspect-video w-full bg-muted overflow-hidden">
                    <img src={post.image} alt="Post content" className="object-cover w-full h-full hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`hover:text-pink-500 hover:bg-pink-500/10 group ${likedPosts.has(post.id) ? 'text-pink-500' : 'text-muted-foreground'}`}
                    onClick={() => handleLike(post.id)}
                    disabled={pendingLikes.has(post.id)}
                    data-testid={`button-like-${post.id}`}
                  >
                    <Heart className={`h-5 w-5 mr-1 ${likedPosts.has(post.id) ? 'fill-current' : 'group-hover:fill-current'}`} />
                    {likeCounts[post.id] ?? post.likes}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10">
                    <MessageCircle className="h-5 w-5 mr-1" />
                    {post.comments}
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                  <Share2 className="h-5 w-5" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))
        )}
      </div>
    </div>
  );
}
