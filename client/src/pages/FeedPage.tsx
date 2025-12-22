import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Sparkles, Loader2, X, Play, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { usePosts, useLikePost, useSiteSettings, useCollectionProgress } from "@/lib/api";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { CrystalSigil } from "@/components/CrystalSigil";
import GamePlayBanner from "@/components/GamePlayBanner";
import { WorldHookSection } from "@/components/home/WorldHookSection";
import { TodayActionsStrip } from "@/components/home/TodayActionsStrip";
import { FieldReportTeaser } from "@/components/home/FieldReportTeaser";
import { RewardsTodayHub } from "@/components/home/RewardsTodayHub";
import { DrawsSection } from "@/components/home/DrawsSection";
import { TrendingCardsSection } from "@/components/home/TrendingCardsSection";
import { TopCollectorsSection } from "@/components/home/TopCollectorsSection";

export default function FeedPage() {
  const { data: posts, isLoading } = usePosts();
  const likePost = useLikePost();
  const [, setLocation] = useLocation();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const [selectedStory, setSelectedStory] = useState<any>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stories } = useQuery<any[]>({
    queryKey: ["/api/stories"],
  });

  const { data: siteSettings } = useSiteSettings();
  const { data: collectionProgress } = useCollectionProgress(!!user);

  const gameplayEnabled = siteSettings?.gameplayEnabled === 'true' || siteSettings?.gameplayEnabled === true;
  
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
  const getCrystalState = (): "dormant" | "active" | "charged" => {
    return "active";
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Crystal Sigil - decorative only */}
      <div className="flex justify-center pt-2">
        <CrystalSigil 
          size={48} 
          state={getCrystalState()} 
        />
      </div>

      {/* World Hook Section - main headline area */}
      <WorldHookSection />

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

      {/* Rewards Today Hub - Unified summons and draws */}
      <RewardsTodayHub />

      {/* Collection Progress Row */}
      {collectionProgress && user && (
        <div 
          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-primary/10 border border-purple-500/20 cursor-pointer hover:border-purple-500/40 transition-colors"
          onClick={() => setLocation(`/@${user.handle?.replace('@', '')}`)}
          data-testid="collection-progress-row"
        >
          <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Target className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Card Collection</span>
              <span className="text-xs text-purple-400 font-medium" data-testid="text-collection-count">
                {collectionProgress.totalUniqueCards} unique
              </span>
            </div>
            {collectionProgress.nextMilestone ? (
              <Progress 
                value={(collectionProgress.totalUniqueCards / collectionProgress.nextMilestone) * 100} 
                className="h-1.5"
              />
            ) : (
              <Progress value={100} className="h-1.5" />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {collectionProgress.nextMilestone 
                ? `${collectionProgress.nextMilestone - collectionProgress.totalUniqueCards} more to next badge`
                : "All milestones achieved!"}
            </p>
          </div>
        </div>
      )}

      {/* Prize Draws Section */}
      <DrawsSection />

      {/* Trending Cards Section */}
      <TrendingCardsSection />

      {/* Top Collectors Section */}
      <TopCollectorsSection />

      {/* Today's Actions Strip */}
      <TodayActionsStrip />

      {/* Game Play Banner */}
      {gameplayEnabled && <GamePlayBanner />}

      {/* Field Report Teaser */}
      <FieldReportTeaser />

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
