import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Sparkles, Loader2, Trophy, Clock, Gift, ChevronRight, X, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePosts, useLikePost } from "@/lib/api";
import { useLocation } from "wouter";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function FeedPage() {
  const { data: posts, isLoading } = usePosts();
  const likePost = useLikePost();
  const [, setLocation] = useLocation();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const [selectedStory, setSelectedStory] = useState<any>(null);

  const { data: stories } = useQuery<any[]>({
    queryKey: ["/api/stories"],
  });
  
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
        <div 
          className="flex flex-col items-center space-y-2 min-w-[80px] cursor-pointer"
          onClick={() => setLocation("/create")}
          data-testid="button-add-story"
        >
          <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] hover:scale-105 transition-transform">
            <div className="h-full w-full rounded-full bg-card border-2 border-background flex items-center justify-center">
               <span className="text-2xl">+</span>
            </div>
          </div>
          <span className="text-xs font-medium">Add Story</span>
        </div>
        {stories && stories.length > 0 ? (
          stories.map((story: any) => (
            <div 
              key={story.id} 
              className="flex flex-col items-center space-y-2 min-w-[80px] cursor-pointer"
              onClick={() => setSelectedStory(story)}
              data-testid={`story-circle-${story.id}`}
            >
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary via-purple-500 to-secondary p-[2px] hover:scale-105 transition-transform">
                <div className="h-full w-full rounded-full bg-card border-2 border-background overflow-hidden relative">
                  {story.mediaType === "video" ? (
                    <>
                      <img 
                        src={story.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.userId}`} 
                        alt="avatar" 
                        className="h-full w-full object-cover" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </>
                  ) : (
                    <img 
                      src={story.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.userId}`} 
                      alt="avatar" 
                      className="h-full w-full object-cover" 
                    />
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground truncate max-w-[70px]">
                {story.user?.name || "User"}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center text-muted-foreground text-sm py-2 px-4">
            No stories yet
          </div>
        )}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black border-white/10 overflow-hidden">
          {selectedStory && (
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/30">
                  <img 
                    src={selectedStory.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStory.userId}`} 
                    alt="avatar" 
                    className="h-full w-full object-cover" 
                  />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{selectedStory.user?.name || "User"}</p>
                  <p className="text-white/60 text-xs">
                    {formatDistanceToNow(new Date(selectedStory.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-white hover:bg-white/20"
                  onClick={() => setSelectedStory(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="aspect-[9/16] bg-black">
                {selectedStory.mediaType === "video" ? (
                  <video 
                    src={selectedStory.mediaUrl} 
                    controls 
                    autoPlay 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img 
                    src={selectedStory.mediaUrl} 
                    alt="Story" 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              
              {selectedStory.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-sm">{selectedStory.caption}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summon Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card 
          className="relative overflow-hidden border-purple-500/50 bg-gradient-to-r from-purple-950/50 via-cyan-950/30 to-pink-950/30 cursor-pointer hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all group"
          onClick={() => setLocation("/gacha")}
          data-testid="banner-summon"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-purple-400/30 rounded-full animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-cyan-400/30 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 blur-2xl rounded-full" />
          
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text">
                    DAILY SUMMON
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Step through the Fracture Portal • Collect rare cards
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-green-400 font-bold uppercase">Free Pull Ready</span>
                </div>
                <ChevronRight className="h-5 w-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Featured Draw Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
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
      <Card className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 border-primary/30 shadow-lg">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/30 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
            <Sparkles className="text-primary h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-display font-bold text-white neon-text">Create & Share</p>
            <p className="text-sm text-muted-foreground mt-1">Post your thoughts, share fan art, or generate your unique AI anime avatar!</p>
          </div>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_hsl(var(--primary)/0.5)]"
            onClick={() => setLocation("/create")}
            data-testid="button-create-post"
          >
            Create Now
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
