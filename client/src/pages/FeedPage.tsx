import { POSTS } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function FeedPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
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
          <Button size="sm" variant="secondary" className="bg-primary/20 hover:bg-primary/30 text-primary border-none">
            Create
          </Button>
        </CardContent>
      </Card>

      {/* Feed Posts */}
      <div className="space-y-6">
        {POSTS.map((post, index) => (
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
                  <p className="font-bold text-sm hover:text-primary cursor-pointer transition-colors">{post.user.name}</p>
                  <p className="text-xs text-muted-foreground">{post.user.handle} • {post.timestamp}</p>
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
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 group">
                    <Heart className="h-5 w-5 mr-1 group-hover:fill-current" />
                    {post.likes}
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
        ))}
      </div>
    </div>
  );
}
