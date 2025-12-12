import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Type, Video, Wand2, Send, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useCreatePost } from "@/lib/api";
import { toast } from "sonner";

export default function CreatePostPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const createPost = useCreatePost();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
      
      toast.success("Post created!");
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
        <p className="text-muted-foreground">Share your theories, art, or daily updates with the realm.</p>
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
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">Create Story</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Share a moment from your day. Stories disappear after 24 hours.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <ImageIcon className="h-5 w-5" />
                    <span>Upload Images</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Maximum 5 images per story</li>
                    <li>• Max file size: 5MB each</li>
                    <li>• Formats: JPG, PNG, GIF, WebP</li>
                  </ul>
                  <Button variant="outline" className="w-full border-white/10" data-testid="button-upload-images">
                    Select Images
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Video className="h-5 w-5" />
                    <span>Upload Video</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Maximum 1 video per story</li>
                    <li>• Max length: 60 seconds</li>
                    <li>• Max file size: 50MB</li>
                    <li>• Formats: MP4, MOV, WebM</li>
                  </ul>
                  <Button variant="outline" className="w-full border-white/10" data-testid="button-upload-video">
                    Select Video
                  </Button>
                </div>
              </div>

              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200/80">
                  Stories are visible for 24 hours only. After that, they will be automatically removed.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
