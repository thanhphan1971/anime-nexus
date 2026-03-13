import { authFetch } from "@/lib/authFetch";
import { useState, useCallback, lazy, Suspense, useRef } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Settings, MapPin, Link as LinkIcon, Calendar, Loader2, Crown, Upload, Sparkles, Globe, ZoomIn, Check, X, Copy, ExternalLink, Award, Target, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { usePosts, useUpdateUser, useUserByHandle, useUser, usePresetAvatars, useUpdateAvatar, useUserProfile } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Area } from "react-easy-crop";

const Cropper = lazy(() => import("react-easy-crop"));


const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL("image/jpeg", 0.9);
}

function getBadgeRule(code: string): string {
  const rules: Record<string, string> = {
    'collector_1': 'Own 10 unique cards',
    'collector_2': 'Own 25 unique cards',
    'collector_3': 'Own 50 unique cards',
    's_class': 'Be an S-Class member',
    'founder': 'Be an early platform adopter',
    'early_realmwalker': 'Join during early access',
  };
  return rules[code] || 'Special achievement';
}

export default function ProfilePage() {
  
  const params = useParams();
  const id = params.id;
  const username = params.username;
  const { user: currentUser, refreshUser } = useAuth();
  const { data: allPosts, isLoading: postsLoading } = usePosts();
  const updateUser = useUpdateUser();
  const { data: presetAvatars } = usePresetAvatars();
  const updateAvatar = useUpdateAvatar();
  
  // Fetch user by handle if username param is provided
  const { data: userByHandle, isLoading: handleLoading, error: handleError } = useUserByHandle(username);
  
  // Fetch user by ID if id param is provided and it's not the current user
  const { data: userById, isLoading: idLoading } = useUser(
    id && id !== currentUser?.id && id !== 'me' ? id : undefined
  );
  
  // Determine user ID for profile data
  const targetUserId = username ? userByHandle?.id : (id && id !== 'me' ? id : currentUser?.id);
  
  // Fetch profile data with badges and collection stats
  const { data: profileData } = useUserProfile(targetUserId);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    avatar: "",
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  // Determine which user to display
  const isOwnProfile = !id && !username || id === currentUser?.id || id === 'me' || 
    (username && userByHandle?.id === currentUser?.id);
  
  // Priority: username lookup > id lookup > current user
  const profileUser = username ? userByHandle : (id && id !== currentUser?.id && id !== 'me' ? userById : currentUser);
  
  const profileId = profileUser?.id || currentUser?.id;
  const userPosts = allPosts?.filter((post: any) => post.userId === profileId) || [];
  
  // Get shareable profile URL
  const getShareableUrl = () => {
    const handle = profileUser?.handle?.replace('@', '') || '';
    return `anirealm.net/@${handle}`;
  };
  
  const copyProfileLink = () => {
    const url = `https://${getShareableUrl()}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied!");
  };

  const openEditDialog = () => {
    if (currentUser) {
      setEditForm({
        name: currentUser.name || "",
        bio: currentUser.bio || "",
        avatar: currentUser.avatar || "",
      });
      setSelectedPresetId(null);
      setEditDialogOpen(true);
    }
  };

  const handleGenerateAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    const styles = ['avataaars', 'bottts', 'fun-emoji', 'lorelei', 'notionists', 'pixel-art'];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    const newAvatar = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${randomSeed}`;
    setEditForm({ ...editForm, avatar: newAvatar });
    setSelectedPresetId(null);
    toast.success("New avatar generated!");
  };

const [isUploading, setIsUploading] = useState(false);

// File picker ref (reliable trigger inside Dialog)
const fileInputRef = useRef<HTMLInputElement | null>(null);

const openFilePicker = () => {
  console.log("[upload] openFilePicker()");
  const el = fileInputRef.current;
  console.log("[upload] fileInputRef.current =", el);

  if (!el) {
    toast.error("Upload control not ready. Refresh and try again.");
    return;
  }

  el.value = ""; // allow selecting the same file again
  el.click();
};

  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log("[upload] change fired", {
    hasFiles: !!e.target.files,
    count: e.target.files?.length,
  });

  const file = e.target.files?.[0];

  console.log("[upload] selected file", file);

  // ✅ Required for TypeScript safety
  if (!file) {
    toast.error("No file selected");
    return;
  }
  // ✅ Allow up to 2MB
  if (file.size > 2 * 1024 * 1024) {
    console.warn("[upload] rejected: file too large", file.size);
    toast.error("Avatar image must be 2 MB or smaller");
    e.target.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    toast.error("Please select an image file");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const result = reader.result as string;
    console.log("[upload] FileReader loaded");
    console.log("[upload] opening cropper", { len: result?.length });

    setImageToCrop(result);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropperOpen(true);
  };

  reader.onerror = () => {
    toast.error("Failed to read image file");
  };

  reader.readAsDataURL(file);

  // Allow selecting the same file again
  e.target.value = "";
};
    
    

  const handleCropConfirm = async () => {
      if (!imageToCrop || !croppedAreaPixels) return;

  setIsUploading(true);

  try {
    // 1) Crop to DataURL
    const croppedDataUrl = await getCroppedImg(imageToCrop, croppedAreaPixels);

    // 2) Compress image using canvas
    const img = new Image();
    img.src = croppedDataUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load cropped image"));
    });

    const canvas = document.createElement("canvas");

    const MAX_SIZE = 512;
    const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height, 1);

    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context failed");

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Convert to compressed blob
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) {
            reject(new Error("Image compression failed"));
            return;
          }
          resolve(b);
        },
        "image/webp",
        0.82
      );
    });

    const mimeType = blob.type || "image/webp";
    const sizeBytes = blob.size;

    // 3) Get signed upload URL
    const uploadUrlRes = await authFetch("/api/media/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: mimeType,
        sizeBytes,
        kind: "avatar",
      }),
    });

    if (!uploadUrlRes.ok) throw new Error(await uploadUrlRes.text());

    const { signedUrl, objectKey } = (await uploadUrlRes.json()) as {
      signedUrl: string;
      objectKey: string;
    };

    // 4) Upload directly to storage
    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: blob,
    });

    if (!putRes.ok) throw new Error("Upload failed");

    // 5) Finalize upload
    const completeRes = await authFetch("/api/media/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objectKey,
        kind: "avatar",
        mimeType,
        sizeBytes,
      }),
    });

    if (!completeRes.ok) throw new Error(await completeRes.text());

    const { publicUrl } = (await completeRes.json()) as { publicUrl: string };

    // 6) Save URL into form (this is what Save Changes persists)
    setEditForm((prev) => ({ ...prev, avatar: publicUrl }));
    setSelectedPresetId(null);

    // Reset cropper UI
    setCropperOpen(false);
    setImageToCrop(null);

    toast.success("Avatar uploaded!");
  } catch (error: any) {
    console.error(error);
    toast.error(error?.message || "Failed to upload avatar");
  } finally {
    setIsUploading(false);
  }
};

const handleCropCancel = () => {
  setCropperOpen(false);
  setImageToCrop(null);
  setCrop({ x: 0, y: 0 });
  setZoom(1);
  setCroppedAreaPixels(null);
};



  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    try {
      // If a preset avatar was selected, use the secure avatar endpoint
      if (selectedPresetId) {
        await updateAvatar.mutateAsync({
          userId: currentUser.id,
          avatarId: selectedPresetId,
        });
      }
      
      // Update other profile fields (name, bio, and non-preset avatar)
      const updates: { name: string; bio: string; avatar?: string } = {
        name: editForm.name,
        bio: editForm.bio,
      };
      
      // Only include avatar in generic update if NOT a preset selection
      if (!selectedPresetId && editForm.avatar !== currentUser.avatar) {
        updates.avatar = editForm.avatar;
      }
      
      await updateUser.mutateAsync({
        userId: currentUser.id,
        updates,
      });
      
      await refreshUser();
      setEditDialogOpen(false);
      toast.success("Profile updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  };

  // Loading state
  if (handleLoading || idLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 404 - user not found by handle
  if (username && handleError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] text-center">
        <h1 className="text-4xl font-display mb-4">User Not Found</h1>
        <p className="text-muted-foreground mb-6">The profile @{username} doesn't exist.</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">Edit Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-primary/50">
                  {isUploading ? (
                    <div className="h-full w-full flex items-center justify-center bg-card">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <img 
                      src={editForm.avatar || profileUser.avatar} 
                      alt="Avatar" 
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <div className="w-full">
                  <Button
  type="button"
  variant="outline"
  className="w-full border-white/20 bg-white/5 hover:bg-white/10"
  onClick={openFilePicker}
  disabled={isUploading}
  data-testid="button-avatar-upload"
>
  <Upload className="h-4 w-4 mr-2" />
  Upload Image
</Button>

<input
  ref={fileInputRef}
  type="file"
  accept="image/png,image/jpeg,image/gif,image/webp"
  onChange={handleImageUpload}
  className="sr-only"
  data-testid="input-avatar-upload"
/>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleGenerateAvatar}
                  className="w-full border-primary/50 text-primary hover:bg-primary/10"
                  data-testid="button-generate-avatar"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Auto-Generate Avatar
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Upload your own image (max 2MB) or generate a unique avatar
              </p>
              
              {/* Preset Avatar Picker */}
              <div className="w-full mt-4 pt-4 border-t border-white/10">
                <p className="text-sm font-medium mb-3 text-center">Or choose a preset avatar:</p>
                <div className="grid grid-cols-6 gap-2">
                  {presetAvatars?.map((preset: { id: string; url: string; name: string }) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setEditForm({ ...editForm, avatar: preset.url });
                        setSelectedPresetId(preset.id);
                      }}
                      className={`relative h-10 w-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                        selectedPresetId === preset.id 
                          ? 'border-primary ring-2 ring-primary/50' 
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      data-testid={`button-preset-avatar-${preset.id}`}
                    >
                      <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" />
                      {selectedPresetId === preset.id && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  AI Avatars: Coming later. Presets only for now.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Your display name"
                  className="bg-white/5 border-white/10"
                  data-testid="input-edit-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="bg-white/5 border-white/10 min-h-[100px]"
                  data-testid="input-edit-bio"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={updateUser.isPending}
              data-testid="button-save-profile"
            >
              {updateUser.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Dialog */}
      <Dialog open={cropperOpen} onOpenChange={(open) => !open && handleCropCancel()}>
        <DialogContent className="bg-card border-white/10 max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-xl font-display">Adjust Your Photo</DialogTitle>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            <div className="relative h-72 w-full bg-black rounded-lg overflow-hidden">
              {imageToCrop && (
               <Suspense fallback={null}>
  <Cropper
    image={imageToCrop}
    crop={crop}
    zoom={zoom}
    aspect={1}
    cropShape="round"
    showGrid={false}
    onCropChange={setCrop}
    onCropComplete={onCropComplete}
    onZoomChange={setZoom}
  />
</Suspense>

              )}
            </div>
            
            <div className="flex items-center gap-4 px-2">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                className="flex-1"
                data-testid="slider-crop-zoom"
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Drag to move • Use slider to zoom in/out
            </p>
          </div>
          
          <DialogFooter className="p-4 pt-0">
            <Button variant="ghost" onClick={handleCropCancel} data-testid="button-crop-cancel">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleCropConfirm}
              disabled={isUploading}
              data-testid="button-crop-confirm"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 md:h-64 w-full rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-secondary opacity-80" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        {/* Profile Info Overlay */}
<div className="px-4 md:px-8 relative -mt-16 md:-mt-20 flex flex-col md:flex-row items-end md:items-end gap-6">
  <div className="h-32 w-32 md:h-40 md:w-40 shrink-0 aspect-square rounded-full border-4 border-background overflow-hidden shadow-2xl bg-background">
    <img
      src={profileUser.avatar || "/default-avatar.png"}
      alt={profileUser.name}
      className="block !h-full !w-full object-cover"
      data-testid="img-profile-avatar"
    />
  </div>

  <div className="flex-1 pb-2 text-center md:text-left">
    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-1">
      <h1 className="text-3xl font-display font-bold" data-testid="text-profile-name">
        {profileUser.name}
      </h1>

      {profileUser.isPremium && (
        <Badge className="w-fit mx-auto md:mx-0 bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
          <Crown className="h-3 w-3 mr-1" /> S-Class
        </Badge>
      )}

      <Badge
        variant="secondary"
        className="w-fit mx-auto md:mx-0 bg-primary/20 text-primary border-primary/50"
      >
        Lvl. {profileUser.level || 1}
      </Badge>
    </div>

    {/* XP Progress Bar */}
    <div className="mt-2 w-full max-w-xs mx-auto md:mx-0">
      <div className="mb-1 text-xs text-muted-foreground">
        {(profileUser.currentLevelXp ?? 0)} / {(profileUser.nextLevelXp ?? 100)} XP
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${Math.min(
              100,
              (((profileUser.currentLevelXp ?? 0) /
                Math.max(1, profileUser.nextLevelXp ?? 100)) * 100)
            )}%`,
          }}
        />
      </div>
    </div>

    <p className="text-muted-foreground font-mono" data-testid="text-profile-handle">
      {profileUser.handle}
    </p>
  </div>

  <div className="flex gap-3 pb-4 w-full md:w-auto">
    {isOwnProfile ? (
      <Button
        variant="outline"
        className="flex-1 md:flex-none border-white/10"
        onClick={openEditDialog}
        data-testid="button-edit-profile"
      >
        <Settings className="h-4 w-4 mr-2" /> Edit Profile
      </Button>
    ) : (
      <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90" data-testid="button-follow">
        Follow
      </Button>
    )}
  </div>
</div>
  </div> {/* Close Profile Header */}
      {/* Bio & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
           <Card className="bg-card/50 border-white/5">
             <CardContent className="p-4 space-y-4">
               <div>
                 <h3 className="font-bold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Bio</h3>
                 <p className="text-sm leading-relaxed" data-testid="text-profile-bio">{profileUser.bio || "No bio yet"}</p>
               </div>
               
               <div className="space-y-2 text-sm text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <MapPin className="h-4 w-4" /> Neo Tokyo, Sector 7
                 </div>
                 <div className="flex items-center gap-2 group">
                   <LinkIcon className="h-4 w-4" />
                   <span className="text-primary cursor-pointer hover:underline" onClick={copyProfileLink} data-testid="link-shareable-url">
                     {getShareableUrl()}
                   </span>
                   <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-muted-foreground hover:text-primary" onClick={copyProfileLink} />
                 </div>
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4" /> Joined {profileUser.createdAt ? (() => {
                     const date = new Date(profileUser.createdAt);
                     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                     return `${months[date.getMonth()]} ${date.getFullYear()}`;
                   })() : 'recently'}
                 </div>
                 {isOwnProfile && (
                   <Link href="/account">
                     <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" data-testid="link-account">
                       <Settings className="h-4 w-4" /> Account
                     </div>
                   </Link>
                 )}
                 <Link href="/universe">
                   <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" data-testid="link-universe">
                     <Globe className="h-4 w-4" /> Explore the Universe
                   </div>
                 </Link>
               </div>

               {/* Stats */}
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                 <div className="text-center">
                   <p className="text-2xl font-bold text-primary" data-testid="text-followers">{profileUser.followers || 0}</p>
                   <p className="text-xs text-muted-foreground">Followers</p>
                 </div>
                 <div className="text-center">
                   <p className="text-2xl font-bold text-primary" data-testid="text-following">{profileUser.following || 0}</p>
                   <p className="text-xs text-muted-foreground">Following</p>
                 </div>
               </div>

               <div>
                 <h3 className="font-bold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Interests</h3>
                 <div className="flex flex-wrap gap-2">
                   {(profileUser.animeInterests && profileUser.animeInterests.length > 0) ? (
                     profileUser.animeInterests.map((interest: string) => (
                       <Badge key={interest} variant="outline" className="bg-primary/10 text-primary border-primary/20">
                         {interest}
                       </Badge>
                     ))
                   ) : (
                     <p className="text-sm text-muted-foreground">No interests added yet</p>
                   )}
                 </div>
               </div>

               {/* Badges Section */}
               {profileData && (
                 <div className="pt-4 border-t border-white/10">
                   <h3 className="font-bold mb-3 text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                     <Award className="h-4 w-4" /> Badges ({profileData.badges?.length || 0})
                   </h3>
                   
                   {/* Earned Badges */}
                   {profileData.badges && profileData.badges.length > 0 ? (
                     <div className="space-y-2 mb-4">
                       <TooltipProvider>
                         {profileData.badges.map((badge: any) => (
                           <Tooltip key={badge.code}>
                             <TooltipTrigger asChild>
                               <div
                                 className="flex items-start gap-3 p-2.5 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 cursor-default"
                                 data-testid={`badge-${badge.code}`}
                               >
                                 <span className="text-xl flex-shrink-0">{badge.icon || '🏆'}</span>
                                 <div className="flex-1 min-w-0">
                                   <p className="text-sm font-medium">{badge.name}</p>
                                   <p className="text-xs text-muted-foreground line-clamp-1">{badge.description}</p>
                                   <p className="text-xs text-primary/80 mt-0.5">
                                     Earned by: {getBadgeRule(badge.code)}
                                   </p>
                                 </div>
                               </div>
                             </TooltipTrigger>
                             <TooltipContent side="top" className="max-w-[200px]">
                               <p className="font-medium">{badge.name}</p>
                               <p className="text-xs text-muted-foreground">{badge.description}</p>
                             </TooltipContent>
                           </Tooltip>
                         ))}
                       </TooltipProvider>
                     </div>
                   ) : (
                     <p className="text-sm text-muted-foreground mb-4">No badges earned yet</p>
                   )}

                   {/* Locked Badges - Next Milestones */}
                   {(() => {
                     const totalCards = profileData.totalUniqueCards || 0;
                     const milestones = [
                       { threshold: 10, name: "Collector I", icon: "🃏" },
                       { threshold: 25, name: "Collector II", icon: "🎴" },
                       { threshold: 50, name: "Collector III", icon: "🏅" },
                     ];
                     const lockedMilestones = milestones.filter(m => totalCards < m.threshold);
                     
                     if (lockedMilestones.length === 0) return null;
                     
                     return (
                       <div className="space-y-2">
                         <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                           <Lock className="h-3 w-3" /> Next Badges
                         </p>
                         {lockedMilestones.map((milestone) => (
                           <div
                             key={milestone.threshold}
                             className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10 opacity-60"
                             data-testid={`locked-badge-${milestone.threshold}`}
                           >
                             <span className="text-lg grayscale">{milestone.icon}</span>
                             <div className="flex-1 min-w-0">
                               <p className="text-sm font-medium text-muted-foreground">{milestone.name}</p>
                               <p className="text-xs text-muted-foreground">Own {milestone.threshold} unique cards</p>
                             </div>
                             <div className="text-xs text-muted-foreground whitespace-nowrap">
                               {totalCards}/{milestone.threshold}
                             </div>
                           </div>
                         ))}
                       </div>
                     );
                   })()}
                 </div>
               )}
             </CardContent>
           </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full bg-card/50 border border-white/5 p-1">
              <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
              <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
              <TabsTrigger value="likes" className="flex-1">Likes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="posts" className="mt-4 space-y-4">
              {postsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userPosts.length > 0 ? (
                userPosts.map((post: any) => (
                  <Card key={post.id} className="bg-card/50 border-white/5">
                    <CardContent className="p-4 flex gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profileUser.avatar} />
                        <AvatarFallback>{profileUser.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold mr-2">{profileUser.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm">{post.content}</p>
                        {post.image && (
                          <div className="mt-3 rounded-lg overflow-hidden">
                            <img src={post.image} alt="Post" className="w-full h-auto" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No posts yet. Share your first transmission!
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="media">
               <div className="text-center py-12 text-muted-foreground">
                 No media uploads yet.
               </div>
            </TabsContent>

            <TabsContent value="likes">
               <div className="text-center py-12 text-muted-foreground">
                 No liked posts yet.
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
