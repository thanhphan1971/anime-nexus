import { authFetch } from "@/lib/authFetch";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Type, Video, Wand2, Send, X, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useCreatePost } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CreatePostPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Story state
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const storyImageInputRef = useRef<HTMLInputElement>(null);
  const storyVideoInputRef = useRef<HTMLInputElement>(null);

   // Fetch story limits (authorized request)
const { data: storyLimits } = useQuery<
  { storiesPosted: number; maxStories: number } | null
>({
  queryKey: ["/api/stories/limits"],
  enabled: !!user,
  queryFn: async () => {
    const res = await authFetch("/api/stories/limits");

    // If not authenticated yet, return null (don’t crash UI)
    if (res.status === 401 || res.status === 403) {
      return null;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to load story limits: ${res.status} ${text}`
      );
    }

    return res.json();
  },
});



  // Create story mutation
  const createStory = useMutation({
    mutationFn: async (data: { mediaUrl: string; mediaType: string; caption?: string; mimeType: string; fileSize: number; videoDuration?: number }) => {
      
      const res = await authFetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
throw new Error(err?.error || "Failed to create story");

      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/limits"] });
      toast.success("Story added! Expires in 24h", {
        description: "Enter the Weekly Draw for a chance to win!",
        action: {
          label: "Go to Draws",
          onClick: () => setLocation("/draws"),
        },
      });
      setStoryFile(null);
      setStoryPreview(null);
      setStoryCaption("");
      setVideoDuration(0);
      setLocation("/");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to post story");
    },
  });

  const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPremium = user?.isPremium;
    
    if (type === "image") {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image too large. Maximum 10 MB");
        return;
      }
    } else {
      const maxSize = isPremium ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`Video too large. Maximum ${isPremium ? "50" : "25"} MB`);
        return;
      }
    }

    setStoryFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setStoryPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (type === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
        const maxDuration = isPremium ? 30 : 15;
        if (video.duration > maxDuration) {
          toast.error(`Video too long. Maximum ${maxDuration} seconds`);
          setStoryFile(null);
          setStoryPreview(null);
        }
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handlePostStory = async () => {
    if (!storyFile || !storyPreview) return;
    
    const mediaType = storyFile.type.startsWith("video/") ? "video" : "image";
    
    await createStory.mutateAsync({
      mediaUrl: storyPreview,
      mediaType,
      caption: storyCaption || undefined,
      mimeType: storyFile.type,
      fileSize: storyFile.size,
      videoDuration: mediaType === "video" ? videoDuration : undefined,
    });
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt first");
      return;
    }
    
    setIsGenerating(true);
    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false);
      toast.info("AI Generation coming soon! This feature will generate anime art from your prompts.");
    }, 1500);
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedImage) return;
    
    try {
      await createPost.mutateAsync({
        content: content.trim() || undefined,
        image: selectedImage || undefined,
      });
      
      toast.success("Posted to Aurelith!", {
        description: "Claim your daily summon",
        action: {
          label: "Go to Summon",
          onClick: () => setLocation("/cards"),
        },
      });
      setLocation("/"); // Redirect to feed
    } catch (error: any) {
      toast.error(error.message || "Failed to create post");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-display font-bold neon-text mb-2">CREATE CONTENT</h1>
        <p className="text-foreground/80">Share your theories, art, or daily updates with the realm.</p>
      </div>

      <Tabs defaultValue="post" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/5 p-1 mb-6 grid grid-cols-3">
          <TabsTrigger value="post" className="flex items-center gap-2">
            <Type className="h-4 w-4" /> Standard Post
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2 text-primary data-[state=active]:text-primary">
            <Wand2 className="h-4 w-4" /> AI Generator
          </TabsTrigger>
          <TabsTrigger value="story" className="flex items-center gap-2">
            <Video className="h-4 w-4" /> Story
          </TabsTrigger>
        </TabsList>

        {/* STANDARD POST TAB */}
        <TabsContent value="post">
          <Card className="bg-card/40 border-white/10">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">What's on your mind, {user?.name}?</Label>
                <Textarea 
                  id="content" 
                  placeholder="Share your latest anime thoughts, reviews, or theories..." 
                  className="min-h-[150px] bg-white/5 border-white/10 resize-none focus:border-primary"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              {selectedImage && (
                <div className="relative rounded-lg overflow-hidden border border-white/10 max-h-[300px]">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => setSelectedImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    id="image-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-white hover:bg-white/10"
                    onClick={() => document.getElementById("image-upload")?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" /> Add Image
                  </Button>
                </div>
                <Button 
                  onClick={handlePost} 
                  disabled={createPost.isPending || (!content && !selectedImage)}
                  className="bg-primary hover:bg-primary/90 min-w-[120px]"
                  data-testid="button-submit-post"
                >
                  {createPost.isPending ? "Posting..." : (
                    <>Post <Send className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI GENERATOR TAB */}
        <TabsContent value="ai">
          <Card className="bg-card/40 border-primary/30 relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">AI Studio</h3>
                  <p className="text-xs text-muted-foreground">Generate unique anime art or captions instantly.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Prompt</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="E.g., Cyberpunk samurai eating ramen in rain..." 
                    className="bg-white/5 border-white/10 focus:border-primary"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    data-testid="input-ai-prompt"
                  />
                  <Button 
                    className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    data-testid="button-generate"
                  >
                    <Wand2 className="mr-2 h-4 w-4" /> {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>

              <div className="aspect-video rounded-xl bg-black/40 border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-muted-foreground">
                <p>Preview Area</p>
                <p className="text-xs opacity-50">Generated content will appear here</p>
              </div>

              <Alert className="bg-primary/10 border-primary/20 text-primary">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>S-Class Feature</AlertTitle>
                <AlertDescription>
                  Full resolution generation is faster for S-Class members.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STORY TAB */}
        <TabsContent value="story">
          <Card className="bg-card/40 border-white/10">
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px] mx-auto">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <Video className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold">Create Story</h3>
                <p className="text-muted-foreground text-sm">
                  Share a moment from your day. Stories disappear after 24 hours.
                </p>
              </div>

              {storyLimits && (
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Stories today: <span className="text-white font-medium">{storyLimits.storiesPosted}</span> / {storyLimits.maxStories}
                  </span>
                  {user?.isPremium && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full font-bold">S-CLASS</span>
                  )}
                </div>
              )}

              {storyPreview ? (
                <div className="space-y-4">
                  <div className="relative aspect-[9/16] max-h-[400px] mx-auto rounded-xl overflow-hidden border border-white/10">
                    {storyFile?.type.startsWith("video/") ? (
                      <video src={storyPreview} controls className="w-full h-full object-contain bg-black" />
                    ) : (
                      <img src={storyPreview} alt="Story preview" className="w-full h-full object-contain bg-black" />
                    )}
                    <Button 
                      size="icon" 
                      variant="destructive" 
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => { setStoryFile(null); setStoryPreview(null); setVideoDuration(0); }}
                      data-testid="button-remove-story-media"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="story-caption">Caption (optional)</Label>
                    <Input
                      id="story-caption"
                      placeholder="Add a caption to your story..."
                      className="bg-white/5 border-white/10 focus:border-primary"
                      value={storyCaption}
                      onChange={(e) => setStoryCaption(e.target.value)}
                      maxLength={200}
                      data-testid="input-story-caption"
                    />
                    <p className="text-xs text-muted-foreground text-right">{storyCaption.length}/200</p>
                  </div>

                  <Button 
                    onClick={handlePostStory} 
                    disabled={createStory.isPending || !storyFile}
                    className="w-full bg-primary hover:bg-primary/90"
                    data-testid="button-post-story"
                  >
                    {createStory.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Posting...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Post Story</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <input 
                    type="file" 
                    ref={storyImageInputRef}
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleStoryFileSelect(e, "image")}
                  />
                  <div 
                    className="p-6 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-primary/50 transition-colors cursor-pointer space-y-3 text-center"
                    onClick={() => storyImageInputRef.current?.click()}
                    data-testid="button-upload-story-image"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Upload Image</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP • Max 10 MB</p>
                    </div>
                  </div>

                  <input 
                    type="file" 
                    ref={storyVideoInputRef}
                    className="hidden" 
                    accept="video/mp4,video/webm"
                    onChange={(e) => handleStoryFileSelect(e, "video")}
                  />
                  <div 
                    className="p-6 rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-primary/50 transition-colors cursor-pointer space-y-3 text-center"
                    onClick={() => storyVideoInputRef.current?.click()}
                    data-testid="button-upload-story-video"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                      <Video className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Upload Video</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, WebM • Max {user?.isPremium ? "30s" : "15s"} • Max {user?.isPremium ? "50" : "25"} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200/80 text-sm">
                  Stories are visible for 24 hours only and will be automatically removed after.
                  {!user?.isPremium && " Upgrade to S-Class for longer videos and more daily stories!"}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
