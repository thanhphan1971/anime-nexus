import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, Users, Database, Sparkles, Calendar, Plus, Upload, Save, 
  ShieldAlert, Ban, UserCheck, MessageSquare, Flag, Trash2, Settings, 
  Activity, Crown, Lock, Unlock, Eye, Search, Loader2, Trophy, Gift,
  Clock, Play, Pause, X, Ticket, Coins
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUsers, useBanUser, useUnbanUser, useGrantPremium, useRevokePremium, useCommunities, useAdminCards, useCreateCard, useDeleteCard, useArchiveCard, useUnarchiveCard, useSiteSettings, useUpdateSiteSetting, useCardCategories, useCreateCardCategory, useDeleteCardCategory, useGetCardUploadUrl, useUpdateCard, useScheduledCards, useUpdateCardStatus, useActivateScheduledCards } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Archive, ArchiveRestore, ImagePlus, Folder, FolderPlus, Edit2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { toast as sonnerToast } from "sonner";

const FLAGGED_CONTENT = [
  { id: 1, reason: "Spam", user: "@bot_account", content: "Buy cheap tokens at...", time: "5m ago" },
  { id: 2, reason: "Harassment", user: "@troll_user", content: "Your cards are trash...", time: "15m ago" },
];

export default function AdminPage() {
  const { toast } = useToast();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: communities, isLoading: communitiesLoading } = useCommunities();
  const { data: allCards, isLoading: cardsLoading } = useAdminCards();
  const createCard = useCreateCard();
  const deleteCard = useDeleteCard();
  const archiveCard = useArchiveCard();
  const unarchiveCard = useUnarchiveCard();
  const updateCard = useUpdateCard();
  const banUser = useBanUser();
  
  const { data: cardCategories, isLoading: categoriesLoading } = useCardCategories();
  const createCardCategory = useCreateCardCategory();
  const deleteCardCategory = useDeleteCardCategory();
  const getCardUploadUrl = useGetCardUploadUrl();
  
  const { data: scheduledCards, isLoading: scheduledLoading } = useScheduledCards();
  const updateCardStatus = useUpdateCardStatus();
  const activateScheduledCards = useActivateScheduledCards();
  
  // Card Library Filters
  const [cardStatusFilter, setCardStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [poolFilter, setPoolFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'event'>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'power-high' | 'power-low' | 'name-az' | 'name-za'>('newest');
  const [showArchived, setShowArchived] = useState<'all' | 'active' | 'archived'>('all');
  const [limitedFilter, setLimitedFilter] = useState<'all' | 'limited' | 'standard'>('all');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", color: "#8B5CF6" });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    step: 1 | 2;
    card: any | null;
    confirmText: string;
  }>({
    isOpen: false,
    step: 1,
    card: null,
    confirmText: "",
  });
  
  const [scheduleDialog, setScheduleDialog] = useState<{
    isOpen: boolean;
    card: any | null;
    status: 'draft' | 'scheduled' | 'active';
    scheduledReleaseDate: string;
    obtainableFrom: string[];
    poolDates: { [key: string]: { start: string; end: string } };
    isLimited: boolean;
    season: string;
  }>({
    isOpen: false,
    card: null,
    status: 'active',
    scheduledReleaseDate: '',
    obtainableFrom: ['daily'],
    poolDates: {},
    isLimited: false,
    season: '',
  });
  
  const openScheduleDialog = (card: any) => {
    setScheduleDialog({
      isOpen: true,
      card,
      status: card.status || 'active',
      scheduledReleaseDate: card.scheduledReleaseDate 
        ? new Date(card.scheduledReleaseDate).toISOString().slice(0, 16) 
        : '',
      obtainableFrom: card.obtainableFrom || ['daily'],
      poolDates: card.poolDates || {},
      isLimited: card.isLimited || false,
      season: card.season || '',
    });
  };
  
  const handleSaveSchedule = async () => {
    if (!scheduleDialog.card) return;
    
    if (scheduleDialog.status === 'scheduled' && !scheduleDialog.scheduledReleaseDate) {
      sonnerToast.error('Scheduled cards require a release date');
      return;
    }
    
    try {
      const updates: any = {
        status: scheduleDialog.status,
        obtainableFrom: scheduleDialog.obtainableFrom,
        poolDates: scheduleDialog.poolDates,
        isLimited: scheduleDialog.isLimited,
        season: scheduleDialog.season || null,
        isReleased: scheduleDialog.status === 'active',
      };
      
      if (scheduleDialog.status === 'scheduled' && scheduleDialog.scheduledReleaseDate) {
        updates.scheduledReleaseDate = new Date(scheduleDialog.scheduledReleaseDate).toISOString();
      } else {
        updates.scheduledReleaseDate = null;
      }
      
      await updateCard.mutateAsync({ cardId: scheduleDialog.card.id, updates });
      sonnerToast.success(`Schedule updated for "${scheduleDialog.card.name}"`);
      setScheduleDialog({ ...scheduleDialog, isOpen: false, card: null });
    } catch (error: any) {
      sonnerToast.error(error.message || 'Failed to update schedule');
    }
  };
  const unbanUser = useUnbanUser();
  const grantPremium = useGrantPremium();
  const revokePremium = useRevokePremium();
  const { data: siteSettings } = useSiteSettings();
  
  const [premiumDialog, setPremiumDialog] = useState<{
    isOpen: boolean;
    user: any | null;
    startDate: string;
    endDate: string;
    isTemporary: boolean;
  }>({
    isOpen: false,
    user: null,
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    isTemporary: false,
  });
  const updateSiteSetting = useUpdateSiteSetting();
  const [dropRate, setDropRate] = useState([2]); // 2% UR rate
  const [promoActive, setPromoActive] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  
  // Token shop enabled state from database
  const tokenShopEnabled = siteSettings?.tokenShopEnabled === 'true';
  
  const handleTokenShopToggle = async (enabled: boolean) => {
    try {
      await updateSiteSetting.mutateAsync({ key: 'tokenShopEnabled', value: String(enabled) });
      sonnerToast.success(enabled ? 'Token Shop enabled' : 'Token Shop disabled');
    } catch (error: any) {
      sonnerToast.error(error.message || 'Failed to update setting');
    }
  };
  const [cardSearch, setCardSearch] = useState("");
  const [newCard, setNewCard] = useState({
    name: "",
    character: "",
    anime: "",
    rarity: "Common",
    image: "",
    power: 500,
    element: "Fire",
    categoryId: "",
    status: "active" as "draft" | "scheduled" | "active",
    scheduledReleaseDate: "",
    obtainableFrom: ["daily"] as string[],
    isLimited: false,
    season: "",
    lore: "",
  });
  
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      sonnerToast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      sonnerToast.error('Image must be less than 5MB');
      return;
    }
    
    setUploadingImage(true);
    try {
      const { uploadUrl, publicUrl } = await getCardUploadUrl.mutateAsync(file.type);
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      setNewCard(prev => ({ ...prev, image: publicUrl }));
      sonnerToast.success('Image uploaded successfully!');
    } catch (error: any) {
      sonnerToast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }, [getCardUploadUrl]);
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  }, [handleImageUpload]);
  
  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      sonnerToast.error('Category name is required');
      return;
    }
    const slug = newCategory.slug || newCategory.name.toLowerCase().replace(/\s+/g, '-');
    try {
      await createCardCategory.mutateAsync({ name: newCategory.name, slug, color: newCategory.color });
      sonnerToast.success(`Category "${newCategory.name}" created!`);
      setNewCategory({ name: "", slug: "", color: "#8B5CF6" });
      setShowCategoryForm(false);
    } catch (error: any) {
      sonnerToast.error(error.message || 'Failed to create category');
    }
  };
  
  const handleCreateCard = async () => {
    if (!newCard.name || !newCard.character || !newCard.anime) {
      sonnerToast.error("Please fill in all required fields");
      return;
    }
    
    if (newCard.status === 'scheduled' && !newCard.scheduledReleaseDate) {
      sonnerToast.error("Scheduled cards require a release date");
      return;
    }
    
    if (newCard.obtainableFrom.length === 0) {
      sonnerToast.error("Please select at least one gacha pool");
      return;
    }
    
    try {
      const imageUrl = newCard.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${newCard.name.toLowerCase().replace(/\s/g, '')}`;
      const cardData: any = {
        name: newCard.name.trim(),
        character: newCard.character.trim(),
        anime: newCard.anime.trim(),
        rarity: newCard.rarity,
        image: imageUrl,
        power: Number(newCard.power),
        element: newCard.element,
        categoryId: newCard.categoryId || null,
        status: newCard.status,
        obtainableFrom: newCard.obtainableFrom,
        isLimited: newCard.isLimited,
        season: newCard.season || null,
        lore: newCard.lore || null,
        isReleased: newCard.status === 'active',
      };
      
      if (newCard.status === 'scheduled' && newCard.scheduledReleaseDate) {
        cardData.scheduledReleaseDate = new Date(newCard.scheduledReleaseDate).toISOString();
      }
      
      await createCard.mutateAsync(cardData);
      sonnerToast.success(`Card "${newCard.name}" created successfully!`);
      setNewCard({
        name: "",
        character: "",
        anime: "",
        rarity: "Common",
        image: "",
        power: 500,
        element: "Fire",
        categoryId: "",
        status: "active",
        scheduledReleaseDate: "",
        obtainableFrom: ["daily"],
        isLimited: false,
        season: "",
        lore: "",
      });
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to create card");
    }
  };
  
  const handleDeleteCard = (card: any) => {
    if (card.ownerCount > 0) {
      setDeleteConfirmation({
        isOpen: true,
        step: 1,
        card,
        confirmText: "",
      });
    } else {
      handleConfirmDelete(card, false);
    }
  };
  
  const handleConfirmDelete = async (card: any, force: boolean) => {
    if (force && card.ownerCount > 0) {
      if (deleteConfirmation.confirmText !== card.name) {
        sonnerToast.error("Card name doesn't match. Please type the exact name to confirm.");
        return;
      }
    }
    
    try {
      await deleteCard.mutateAsync({ cardId: card.id, force });
      sonnerToast.success(`Card "${card.name}" deleted`);
      setDeleteConfirmation({ isOpen: false, step: 1, card: null, confirmText: "" });
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to delete card");
    }
  };
  
  const handleArchiveCard = async (card: any) => {
    try {
      await archiveCard.mutateAsync(card.id);
      sonnerToast.success(`Card "${card.name}" archived. Users keep their copies, but it's removed from gacha.`);
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to archive card");
    }
  };
  
  const handleUnarchiveCard = async (card: any) => {
    try {
      await unarchiveCard.mutateAsync(card.id);
      sonnerToast.success(`Card "${card.name}" restored to gacha pool.`);
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to restore card");
    }
  };
  
  const filteredCards = (allCards?.filter((card: any) => {
    const matchesSearch = card.name.toLowerCase().includes(cardSearch.toLowerCase()) || 
      card.character.toLowerCase().includes(cardSearch.toLowerCase()) ||
      card.anime.toLowerCase().includes(cardSearch.toLowerCase());
    const matchesCategory = categoryFilter === "all" || 
      (categoryFilter === "uncategorized" && !card.categoryId) ||
      card.categoryId === categoryFilter;
    const matchesStatus = cardStatusFilter === "all" || card.status === cardStatusFilter;
    const matchesPool = poolFilter === "all" || card.obtainableFrom?.includes(poolFilter);
    const matchesRarity = rarityFilter === "all" || card.rarity === rarityFilter;
    const matchesArchived = showArchived === "all" || 
      (showArchived === "active" && !card.isArchived) ||
      (showArchived === "archived" && card.isArchived);
    const matchesLimited = limitedFilter === "all" ||
      (limitedFilter === "limited" && card.isLimited) ||
      (limitedFilter === "standard" && !card.isLimited);
    return matchesSearch && matchesCategory && matchesStatus && matchesPool && matchesRarity && matchesArchived && matchesLimited;
  }) || []).sort((a: any, b: any) => {
    switch (sortOrder) {
      case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'power-high': return b.power - a.power;
      case 'power-low': return a.power - b.power;
      case 'name-az': return a.name.localeCompare(b.name);
      case 'name-za': return b.name.localeCompare(a.name);
      default: return 0;
    }
  });

  const openPremiumDialog = (user: any) => {
    const hasExistingDates = user.premiumStartDate || user.premiumEndDate;
    setPremiumDialog({
      isOpen: true,
      user,
      startDate: user.premiumStartDate 
        ? new Date(user.premiumStartDate).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0],
      endDate: user.premiumEndDate 
        ? new Date(user.premiumEndDate).toISOString().split('T')[0] 
        : "",
      isTemporary: hasExistingDates || false,
    });
  };
  
  const handleGrantPremium = async () => {
    if (!premiumDialog.user) return;
    
    try {
      const params: { userId: string; startDate?: string; endDate?: string } = {
        userId: premiumDialog.user.id,
      };
      
      if (premiumDialog.isTemporary && premiumDialog.endDate) {
        params.startDate = premiumDialog.startDate;
        params.endDate = premiumDialog.endDate;
      }
      
      await grantPremium.mutateAsync(params);
      
      if (premiumDialog.isTemporary && premiumDialog.endDate) {
        sonnerToast.success(`${premiumDialog.user.name} granted temporary S-Class until ${premiumDialog.endDate}!`);
      } else {
        sonnerToast.success(`${premiumDialog.user.name} upgraded to permanent S-Class!`);
      }
      
      setPremiumDialog({ ...premiumDialog, isOpen: false, user: null });
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to grant premium");
    }
  };
  
  const handleRevokePremium = async (userId: string, username: string) => {
    try {
      await revokePremium.mutateAsync(userId);
      sonnerToast.success(`${username}'s S-Class status has been revoked`);
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to revoke premium");
    }
  };

  const handleBanUser = async (userId: string, currentlyBanned: boolean, username: string) => {
    try {
      if (currentlyBanned) {
        await unbanUser.mutateAsync(userId);
        sonnerToast.success(`${username} has been unbanned`);
      } else {
        await banUser.mutateAsync(userId);
        sonnerToast.success(`${username} has been banned`, { className: "border-red-500" });
      }
    } catch (error: any) {
      sonnerToast.error(error.message || "Action failed");
    }
  };

  const filteredUsers = users?.filter((user: any) => 
    user.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    user.handle.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-red-950/20 p-6 rounded-2xl border border-red-500/20">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <ShieldAlert className="h-8 w-8 text-red-500" />
             <h1 className="text-3xl font-display font-bold text-red-500 neon-text">ADMIN CONSOLE</h1>
           </div>
           <p className="text-muted-foreground">Master Control for AniRealm Ecosystem</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-black/40 rounded-lg border border-white/10">
             <div className={`h-3 w-3 rounded-full ${maintenanceMode ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
             <span className="font-mono text-sm font-bold">{maintenanceMode ? "MAINTENANCE MODE" : "SYSTEM ONLINE"}</span>
           </div>
           <Button variant="destructive" onClick={() => setMaintenanceMode(!maintenanceMode)}>
             {maintenanceMode ? "Go Online" : "Emergency Stop"}
           </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/10 p-1 mb-6 flex flex-wrap h-auto gap-2">
          <TabsTrigger value="overview" className="flex-1 min-w-[100px]"><Activity className="h-4 w-4 mr-2" /> Overview</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 min-w-[100px]"><Users className="h-4 w-4 mr-2" /> Users</TabsTrigger>
          <TabsTrigger value="communities" className="flex-1 min-w-[100px]"><MessageSquare className="h-4 w-4 mr-2" /> Communities</TabsTrigger>
          <TabsTrigger value="content" className="flex-1 min-w-[100px]"><Flag className="h-4 w-4 mr-2" /> Content</TabsTrigger>
          <TabsTrigger value="cards" className="flex-1 min-w-[100px]"><Sparkles className="h-4 w-4 mr-2" /> Cards</TabsTrigger>
          <TabsTrigger value="draws" className="flex-1 min-w-[100px]"><Trophy className="h-4 w-4 mr-2" /> Draws</TabsTrigger>
          <TabsTrigger value="economy" className="flex-1 min-w-[100px]"><Database className="h-4 w-4 mr-2" /> Economy</TabsTrigger>
          <TabsTrigger value="system" className="flex-1 min-w-[100px]"><Settings className="h-4 w-4 mr-2" /> System</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: "12,450", icon: Users, color: "text-blue-400" },
              { label: "Daily Active", value: "3,200", icon: Activity, color: "text-green-400" },
              { label: "Cards Summoned", value: "84,302", icon: Sparkles, color: "text-purple-400" },
              { label: "Revenue (Today)", value: "$4,200", icon: BarChart, color: "text-yellow-400" },
            ].map((stat, i) => (
              <Card key={i} className="bg-card/40 border-white/10 hover:border-white/20 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold font-mono mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="bg-card/40 border-white/10">
               <CardHeader>
                 <CardTitle>Recent Activity Log</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   {[
                     { action: "User Banned", target: "@spammer", time: "2m ago", type: "alert" },
                     { action: "New S-Class Sub", target: "@otaku_king", time: "5m ago", type: "success" },
                     { action: "Server Restart", target: "System", time: "1h ago", type: "info" },
                     { action: "UR Card Pulled", target: "@lucky_guy", time: "1h ago", type: "success" },
                   ].map((log, i) => (
                     <div key={i} className="flex items-center justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                       <span className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${log.type === 'alert' ? 'bg-red-500' : log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                         {log.action}
                       </span>
                       <span className="text-muted-foreground">{log.time}</span>
                     </div>
                   ))}
                 </div>
               </CardContent>
             </Card>

             <Card className="bg-card/40 border-white/10">
               <CardHeader>
                 <CardTitle>System Health</CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div>
                   <div className="flex justify-between mb-2 text-sm">
                     <span>Server Load</span>
                     <span className="text-green-400">24%</span>
                   </div>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-green-500 w-[24%]" />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between mb-2 text-sm">
                     <span>Database Connections</span>
                     <span className="text-yellow-400">68%</span>
                   </div>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-yellow-500 w-[68%]" />
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between mb-2 text-sm">
                     <span>Storage Usage</span>
                     <span className="text-blue-400">45%</span>
                   </div>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 w-[45%]" />
                   </div>
                 </div>
               </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users">
          {usersLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <Card className="bg-card/40 border-white/10">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles, bans, and permissions.</CardDescription>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users..." 
                    className="pl-9 bg-black/20 border-white/10" 
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Invite</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No users found matching "{userSearch}"
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user: any) => (
                        <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div data-testid={`text-username-${user.id}`}>{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.handle}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? 'destructive' : user.isPremium ? 'default' : 'secondary'} 
                              className={user.isPremium ? 'bg-yellow-500 text-black font-bold' : ''}>
                              {user.isAdmin ? 'Admin' : user.isPremium ? 'S-Class' : 'User'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`flex items-center gap-2 text-xs ${!user.isBanned ? 'text-green-400' : 'text-red-400'}`}>
                              <span className={`w-2 h-2 rounded-full ${!user.isBanned ? 'bg-green-400' : 'bg-red-400'}`} />
                              {user.isBanned ? 'Banned' : 'Active'}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {user.isPremium ? (
                                <>
                                  <Button 
                                    variant="secondary"
                                    size="sm" 
                                    className="h-8 text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20"
                                    onClick={() => openPremiumDialog(user)}
                                    data-testid={`button-edit-premium-${user.id}`}
                                  >
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Edit Dates
                                  </Button>
                                  <Button 
                                    variant="secondary"
                                    size="sm" 
                                    className="h-8 text-xs bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500/20"
                                    onClick={() => handleRevokePremium(user.id, user.name)}
                                    data-testid={`button-revoke-${user.id}`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Revoke
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  variant="outline"
                                  size="sm" 
                                  className="h-8 text-xs border-dashed border-white/20 hover:border-yellow-500/50 hover:text-yellow-500"
                                  onClick={() => openPremiumDialog(user)}
                                  data-testid={`button-upgrade-${user.id}`}
                                >
                                  <Crown className="h-3 w-3 mr-1" />
                                  Grant S-Class
                                </Button>
                              )}
                              <Button 
                                variant={user.isBanned ? "destructive" : "ghost"} 
                                size="sm" 
                                className={`h-8 text-xs ${user.isBanned ? '' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'}`}
                                onClick={() => handleBanUser(user.id, user.isBanned, user.name)}
                                data-testid={`button-ban-${user.id}`}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                {user.isBanned ? "Unban" : "Ban"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* COMMUNITIES TAB */}
        <TabsContent value="communities">
           <Card className="bg-card/40 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Community Rooms</CardTitle>
                <CardDescription>Create and manage official chat rooms.</CardDescription>
              </div>
              <Button size="sm" className="bg-primary"><Plus className="h-4 w-4 mr-2" /> Create Room</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead>Room Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communitiesLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : communities && communities.length > 0 ? (
                      communities.map((room: any) => {
                        const isPrivate = room.isPrivate ?? false;
                        const category = room.category || 'General';
                        const memberCount = room.memberCount ?? 0;
                        return (
                          <TableRow key={room.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-bold">{room.name || 'Unnamed'}</TableCell>
                            <TableCell>{category}</TableCell>
                            <TableCell>{memberCount}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={isPrivate ? 'text-yellow-400 border-yellow-400' : 'text-green-400 border-green-400'}>
                                {isPrivate ? 'Private' : 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  {isPrivate ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No communities found. Create one to get started!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTENT TAB */}
        <TabsContent value="content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/40 border-white/10">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <Flag className="h-5 w-5" /> Moderation Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {FLAGGED_CONTENT.map((item) => (
                  <div key={item.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-red-400">{item.reason}</span>
                        <span className="text-xs text-muted-foreground ml-2">by {item.user} • {item.time}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" className="h-6 text-xs">Ban</Button>
                        <Button size="sm" variant="secondary" className="h-6 text-xs">Ignore</Button>
                      </div>
                    </div>
                    <p className="text-sm bg-black/40 p-2 rounded text-muted-foreground italic">"{item.content}"</p>
                  </div>
                ))}
                {FLAGGED_CONTENT.length === 0 && (
                   <div className="text-center py-8 text-muted-foreground">No flagged content. Good job!</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-white/10">
              <CardHeader>
                <CardTitle>Global Announcements</CardTitle>
                <CardDescription>Post a message to all users' feeds.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Message Title</Label>
                  <Input placeholder="e.g. Server Maintenance" />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <textarea className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Message content..." />
                </div>
                <Button className="w-full">
                  <Upload className="mr-2 h-4 w-4" /> Broadcast Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CARDS TAB */}
        <TabsContent value="cards" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Cards", value: allCards?.length || 0, icon: Sparkles, color: "text-purple-400" },
              { label: "Legendary", value: allCards?.filter((c: any) => c.rarity === "Legendary").length || 0, icon: Crown, color: "text-yellow-400" },
              { label: "Mythic", value: allCards?.filter((c: any) => c.rarity === "Mythic").length || 0, icon: Trophy, color: "text-red-400" },
            ].map((stat, i) => (
              <Card key={i} className="bg-card/40 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold font-mono mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/40 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-purple-400" />
                  Create New Card
                </CardTitle>
                <CardDescription>Add a new card to the gacha pool</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Card Name *</Label>
                    <Input 
                      placeholder="e.g. Mystic Flames" 
                      value={newCard.name}
                      onChange={(e) => setNewCard({...newCard, name: e.target.value})}
                      data-testid="input-card-name" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Character *</Label>
                    <Input 
                      placeholder="e.g. Natsu Dragneel" 
                      value={newCard.character}
                      onChange={(e) => setNewCard({...newCard, character: e.target.value})}
                      data-testid="input-card-character" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Anime *</Label>
                    <Input 
                      placeholder="e.g. Fairy Tail" 
                      value={newCard.anime}
                      onChange={(e) => setNewCard({...newCard, anime: e.target.value})}
                      data-testid="input-card-anime" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rarity</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={newCard.rarity}
                      onChange={(e) => setNewCard({...newCard, rarity: e.target.value})}
                      data-testid="select-card-rarity"
                    >
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                      <option value="Mythic">Mythic</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Element</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={newCard.element}
                      onChange={(e) => setNewCard({...newCard, element: e.target.value})}
                      data-testid="select-card-element"
                    >
                      <option value="Fire">Fire</option>
                      <option value="Water">Water</option>
                      <option value="Ice">Ice</option>
                      <option value="Lightning">Lightning</option>
                      <option value="Wind">Wind</option>
                      <option value="Earth">Earth</option>
                      <option value="Light">Light</option>
                      <option value="Dark">Dark</option>
                      <option value="Energy">Energy</option>
                      <option value="Soul">Soul</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Power Level ({newCard.power})</Label>
                    <Slider 
                      value={[newCard.power]} 
                      onValueChange={(val) => setNewCard({...newCard, power: val[0]})}
                      min={100}
                      max={1000}
                      step={10}
                      className="mt-3"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select 
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newCard.categoryId}
                    onChange={(e) => setNewCard({...newCard, categoryId: e.target.value})}
                    data-testid="select-card-category"
                  >
                    <option value="">No Category</option>
                    {cardCategories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Scheduling Section */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
                    <Calendar className="h-4 w-4" />
                    Scheduling & Pool Assignment
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <select 
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={newCard.status}
                        onChange={(e) => setNewCard({...newCard, status: e.target.value as any})}
                        data-testid="select-card-status"
                      >
                        <option value="active">Active (Available Now)</option>
                        <option value="scheduled">Scheduled (Future Release)</option>
                        <option value="draft">Draft (Not Visible)</option>
                      </select>
                    </div>
                    {newCard.status === 'scheduled' && (
                      <div className="space-y-2">
                        <Label>Release Date *</Label>
                        <Input 
                          type="datetime-local"
                          value={newCard.scheduledReleaseDate}
                          onChange={(e) => setNewCard({...newCard, scheduledReleaseDate: e.target.value})}
                          min={new Date().toISOString().slice(0, 16)}
                          data-testid="input-scheduled-date"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Gacha Pools</Label>
                    <div className="flex flex-wrap gap-2">
                      {['daily', 'weekly', 'monthly', 'event'].map((pool) => (
                        <button
                          key={pool}
                          type="button"
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            newCard.obtainableFrom.includes(pool)
                              ? 'bg-purple-500/30 border-purple-400 text-purple-300'
                              : 'bg-transparent border-white/20 text-muted-foreground hover:border-white/40'
                          }`}
                          onClick={() => {
                            const pools = newCard.obtainableFrom.includes(pool)
                              ? newCard.obtainableFrom.filter(p => p !== pool)
                              : [...newCard.obtainableFrom, pool];
                            setNewCard({...newCard, obtainableFrom: pools});
                          }}
                          data-testid={`toggle-pool-${pool}`}
                        >
                          {pool.charAt(0).toUpperCase() + pool.slice(1)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Select which gacha banners this card appears in</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Limited/Event Card</Label>
                      <p className="text-xs text-muted-foreground">Show special badge on card</p>
                    </div>
                    <Switch
                      checked={newCard.isLimited}
                      onCheckedChange={(checked) => setNewCard({...newCard, isLimited: checked})}
                      data-testid="switch-limited"
                    />
                  </div>
                  
                  {newCard.isLimited && (
                    <div className="space-y-2">
                      <Label>Season/Event Name</Label>
                      <Input 
                        placeholder="e.g. Summer 2024, Halloween Event" 
                        value={newCard.season}
                        onChange={(e) => setNewCard({...newCard, season: e.target.value})}
                        data-testid="input-card-season"
                      />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Lore/Description</Label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    placeholder="Optional backstory or description for the card details page..."
                    value={newCard.lore}
                    onChange={(e) => setNewCard({...newCard, lore: e.target.value})}
                    data-testid="textarea-card-lore"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Card Image</Label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                      dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-white/40'
                    } ${newCard.image ? 'bg-white/5' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    data-testid="dropzone-card-image"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                      data-testid="input-file-card-image"
                    />
                    {newCard.image ? (
                      <div className="flex items-center gap-3">
                        <img src={newCard.image} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-green-400 font-medium">Image uploaded</p>
                          <p className="text-xs text-muted-foreground truncate">{newCard.image}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setNewCard({...newCard, image: ""})}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="flex flex-col items-center justify-center py-4 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mb-2" />
                        ) : (
                          <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                        )}
                        <p className="text-sm text-muted-foreground">
                          {uploadingImage ? 'Uploading...' : 'Drop image here or click to upload'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                  <Input 
                    placeholder="Or paste image URL" 
                    value={newCard.image}
                    onChange={(e) => setNewCard({...newCard, image: e.target.value})}
                    data-testid="input-card-image-url" 
                    className="mt-2"
                  />
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500" 
                  onClick={handleCreateCard}
                  disabled={createCard.isPending}
                  data-testid="button-create-card"
                >
                  {createCard.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Create Card
                </Button>
              </CardContent>
            </Card>
            
            {/* Category Management Card */}
            <Card className="bg-card/40 border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-orange-400" />
                    Categories ({cardCategories?.length || 0})
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowCategoryForm(!showCategoryForm)}
                    data-testid="button-toggle-category-form"
                  >
                    {showCategoryForm ? <X className="h-4 w-4 mr-1" /> : <FolderPlus className="h-4 w-4 mr-1" />}
                    {showCategoryForm ? 'Cancel' : 'New Category'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showCategoryForm && (
                  <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input 
                          placeholder="e.g. Shonen" 
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          data-testid="input-category-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input 
                          placeholder="auto-generated" 
                          value={newCategory.slug}
                          onChange={(e) => setNewCategory({...newCategory, slug: e.target.value})}
                          data-testid="input-category-slug"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={newCategory.color}
                            onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                            className="h-10 w-14 rounded border border-input bg-background cursor-pointer"
                            data-testid="input-category-color"
                          />
                          <Input 
                            value={newCategory.color}
                            onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-end">
                        <Button 
                          className="w-full" 
                          onClick={handleCreateCategory}
                          disabled={createCardCategory.isPending}
                          data-testid="button-create-category"
                        >
                          {createCardCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {categoriesLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : cardCategories?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories yet. Create one to organize your cards.</p>
                  ) : (
                    cardCategories?.map((cat: any) => (
                      <Badge 
                        key={cat.id} 
                        variant="outline" 
                        className="px-3 py-1.5 text-sm"
                        style={{ borderColor: cat.color, color: cat.color }}
                        data-testid={`badge-category-${cat.id}`}
                      >
                        {cat.name}
                        <button 
                          className="ml-2 hover:text-red-400 transition-colors"
                          onClick={() => deleteCardCategory.mutate(cat.id)}
                          data-testid={`button-delete-category-${cat.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-cyan-400" />
                  Card Library ({filteredCards.length} / {allCards?.length || 0})
                </CardTitle>
                <CardDescription>Manage existing cards in the gacha pool</CardDescription>
                
                {/* Search Bar */}
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name, character, or anime..." 
                    className="pl-9"
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    data-testid="input-search-cards"
                  />
                </div>
                
                {/* Filter Row 1 */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[100px]"
                    value={cardStatusFilter}
                    onChange={(e) => setCardStatusFilter(e.target.value as any)}
                    data-testid="select-status-filter"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft</option>
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[120px]"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    data-testid="select-category-filter"
                  >
                    <option value="all">All Categories</option>
                    <option value="uncategorized">Uncategorized</option>
                    {cardCategories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[110px]"
                    value={poolFilter}
                    onChange={(e) => setPoolFilter(e.target.value as any)}
                    data-testid="select-pool-filter"
                  >
                    <option value="all">All Pools</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="event">Event</option>
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[100px]"
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value as any)}
                    data-testid="select-rarity-filter"
                  >
                    <option value="all">All Rarities</option>
                    <option value="Common">Common</option>
                    <option value="Rare">Rare</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                    <option value="Mythic">Mythic</option>
                  </select>
                </div>
                
                {/* Filter Row 2 */}
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[100px]"
                    value={showArchived}
                    onChange={(e) => setShowArchived(e.target.value as any)}
                    data-testid="select-archived-filter"
                  >
                    <option value="all">Show All</option>
                    <option value="active">Active Only</option>
                    <option value="archived">Archived Only</option>
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[110px]"
                    value={limitedFilter}
                    onChange={(e) => setLimitedFilter(e.target.value as any)}
                    data-testid="select-limited-filter"
                  >
                    <option value="all">All Cards</option>
                    <option value="limited">Limited/Event</option>
                    <option value="standard">Standard</option>
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[120px]"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    data-testid="select-sort-order"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="power-high">Power: High→Low</option>
                    <option value="power-low">Power: Low→High</option>
                    <option value="name-az">Name: A→Z</option>
                    <option value="name-za">Name: Z→A</option>
                  </select>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs text-muted-foreground"
                    onClick={() => {
                      setCardStatusFilter('all');
                      setCategoryFilter('all');
                      setPoolFilter('all');
                      setRarityFilter('all');
                      setShowArchived('all');
                      setLimitedFilter('all');
                      setSortOrder('newest');
                      setCardSearch('');
                    }}
                    data-testid="button-reset-filters"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      activateScheduledCards.mutate(undefined, {
                        onSuccess: (data: any) => {
                          if (data?.activated > 0) {
                            sonnerToast.success(`${data.activated} card(s) activated!`);
                          } else {
                            sonnerToast.info('No scheduled cards are due for activation yet.');
                          }
                        },
                        onError: (error: any) => {
                          sonnerToast.error(error.message || 'Failed to activate scheduled cards');
                        }
                      });
                    }}
                    disabled={activateScheduledCards.isPending}
                    title="Activate scheduled cards that are past their release date"
                    data-testid="button-activate-scheduled"
                  >
                    {activateScheduledCards.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                    Activate Due
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  {cardsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredCards.map((card: any) => (
                        <div 
                          key={card.id} 
                          className={`flex items-center gap-3 p-3 rounded-lg transition-all border ${
                            card.isArchived 
                              ? 'bg-yellow-500/5 border-yellow-500/20' 
                              : 'bg-white/5 hover:bg-white/10 border-white/5'
                          }`}
                          data-testid={`card-row-${card.id}`}
                        >
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                            <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white truncate">{card.name}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] ${
                                  card.rarity === 'Mythic' ? 'text-red-400 border-red-400/50' :
                                  card.rarity === 'Legendary' ? 'text-yellow-400 border-yellow-400/50' :
                                  card.rarity === 'Epic' ? 'text-purple-400 border-purple-400/50' :
                                  card.rarity === 'Rare' ? 'text-blue-400 border-blue-400/50' :
                                  'text-gray-400 border-gray-400/50'
                                }`}
                              >
                                {card.rarity}
                              </Badge>
                              {card.isArchived && (
                                <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/50">
                                  Archived
                                </Badge>
                              )}
                              {card.status === 'scheduled' && (
                                <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-400/50">
                                  <Clock className="h-2.5 w-2.5 mr-1" />
                                  Scheduled
                                </Badge>
                              )}
                              {card.status === 'draft' && (
                                <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-400/50">
                                  Draft
                                </Badge>
                              )}
                              {card.ownerCount > 0 && (
                                <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/50">
                                  {card.ownerCount} owner{card.ownerCount > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {card.categoryId && cardCategories?.find((c: any) => c.id === card.categoryId) && (
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px]"
                                  style={{ 
                                    color: cardCategories.find((c: any) => c.id === card.categoryId)?.color,
                                    borderColor: cardCategories.find((c: any) => c.id === card.categoryId)?.color + '80'
                                  }}
                                >
                                  {cardCategories.find((c: any) => c.id === card.categoryId)?.name}
                                </Badge>
                              )}
                              {card.isLimited && (
                                <Badge variant="outline" className="text-[10px] text-pink-400 border-pink-400/50">
                                  Limited
                                </Badge>
                              )}
                              {card.obtainableFrom?.length > 0 && (
                                <div className="flex gap-0.5">
                                  {card.obtainableFrom.map((pool: string) => (
                                    <span 
                                      key={pool} 
                                      className={`text-[8px] px-1 py-0.5 rounded ${
                                        pool === 'daily' ? 'bg-green-500/20 text-green-400' :
                                        pool === 'weekly' ? 'bg-blue-500/20 text-blue-400' :
                                        pool === 'monthly' ? 'bg-purple-500/20 text-purple-400' :
                                        'bg-orange-500/20 text-orange-400'
                                      }`}
                                    >
                                      {pool.charAt(0).toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {card.character} • {card.anime}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono text-cyan-400">{card.power} PWR</p>
                            <p className="text-[10px] text-muted-foreground">{card.element}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-cyan-400 hover:bg-cyan-500/10"
                              onClick={() => openScheduleDialog(card)}
                              title="Schedule & Pool Settings"
                              data-testid={`button-schedule-card-${card.id}`}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            {card.isArchived ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-400 hover:bg-green-500/10"
                                onClick={() => handleUnarchiveCard(card)}
                                title="Restore to gacha pool"
                                data-testid={`button-unarchive-card-${card.id}`}
                              >
                                <ArchiveRestore className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-yellow-400 hover:bg-yellow-500/10"
                                onClick={() => handleArchiveCard(card)}
                                title="Archive (remove from gacha, keep in collections)"
                                data-testid={`button-archive-card-${card.id}`}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${
                                card.ownerCount > 0 
                                  ? 'text-orange-400 hover:bg-orange-500/10' 
                                  : 'text-red-400 hover:bg-red-500/10'
                              }`}
                              onClick={() => handleDeleteCard(card)}
                              title={card.ownerCount > 0 ? `Warning: ${card.ownerCount} users own this card` : 'Delete card'}
                              data-testid={`button-delete-card-${card.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {filteredCards.length === 0 && !cardsLoading && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No cards found</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DRAWS TAB */}
        <TabsContent value="draws" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Active Draws", value: "2", icon: Trophy, color: "text-yellow-400" },
              { label: "Total Entries", value: "1,245", icon: Ticket, color: "text-cyan-400" },
              { label: "Winners Today", value: "5", icon: Gift, color: "text-purple-400" },
            ].map((stat, i) => (
              <Card key={i} className="bg-card/40 border-white/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold font-mono mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/40 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-cyan-400" />
                  Create New Draw
                </CardTitle>
                <CardDescription>Schedule a new prize drawing for users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Draw Name</Label>
                  <Input placeholder="e.g. Weekly Legendary Draw" data-testid="input-draw-name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Describe the draw and prizes..."
                    data-testid="input-draw-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cadence</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-draw-cadence">
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="special">Special Event</option>
                      <option value="one_time">One-Time</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Draw Date</Label>
                    <Input type="datetime-local" data-testid="input-draw-date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Prize Type</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" data-testid="select-prize-type">
                    <option value="card">Legendary Card Pack</option>
                    <option value="tokens">Token Bundle (5000)</option>
                    <option value="premium_days">Premium Days (30)</option>
                    <option value="badge">Exclusive Badge</option>
                    <option value="avatar_frame">Avatar Frame</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <Label>Featured Draw</Label>
                    <p className="text-xs text-muted-foreground">Show on homepage banner</p>
                  </div>
                  <Switch data-testid="switch-featured" />
                </div>
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500" data-testid="button-create-draw">
                  <Trophy className="h-4 w-4 mr-2" />
                  Create Draw
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  Scheduled Draws
                </CardTitle>
                <CardDescription>Manage existing prize drawings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Weekly Legendary Draw", cadence: "Weekly", status: "open", date: "Dec 15, 8PM", entries: 342 },
                    { name: "Monthly Mega Draw", cadence: "Monthly", status: "scheduled", date: "Dec 31, 12PM", entries: 0 },
                    { name: "Holiday Special", cadence: "Special", status: "scheduled", date: "Dec 25, 12AM", entries: 0 },
                  ].map((draw, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-yellow-500/50 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold">{draw.name}</span>
                        </div>
                        <Badge variant="outline" className={draw.status === 'open' ? 'text-green-400 border-green-400/50' : 'text-yellow-400 border-yellow-400/50'}>
                          {draw.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {draw.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3 w-3" />
                          {draw.entries} entries
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {draw.status === 'scheduled' && (
                          <Button size="sm" variant="outline" className="flex-1 text-green-400 border-green-400/50" data-testid={`button-open-draw-${i}`}>
                            <Play className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                        )}
                        {draw.status === 'open' && (
                          <Button size="sm" variant="outline" className="flex-1 text-purple-400 border-purple-400/50" data-testid={`button-draw-winner-${i}`}>
                            <Gift className="h-3 w-3 mr-1" />
                            Draw Winner
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-yellow-400 border-yellow-400/50" data-testid={`button-override-draw-${i}`}>
                          Override
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-400 border-red-400/50" data-testid={`button-cancel-draw-${i}`}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/40 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-400" />
                Recent Winners
              </CardTitle>
              <CardDescription>View and manage prize winners</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Winner</TableHead>
                    <TableHead>Draw</TableHead>
                    <TableHead>Prize</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { user: "NeoKai", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=neokai", draw: "Weekly Draw", prize: "Legendary Pack", status: "claimed", time: "2h ago" },
                    { user: "Sakura", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sakura", draw: "Weekly Draw", prize: "5000 Tokens", status: "pending", time: "5h ago" },
                    { user: "Shadow", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=shadow", draw: "Monthly Draw", prize: "30 Days Premium", status: "claimed", time: "1d ago" },
                  ].map((winner, i) => (
                    <TableRow key={i} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={winner.avatar} />
                            <AvatarFallback>{winner.user[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-bold">{winner.user}</span>
                        </div>
                      </TableCell>
                      <TableCell>{winner.draw}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                          {winner.prize}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={winner.status === 'claimed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                          {winner.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {winner.time}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ECONOMY TAB */}
        <TabsContent value="economy" className="space-y-6">
          <Card className="bg-card/40 border-white/10">
            <CardHeader>
              <CardTitle>Global Drop Rates</CardTitle>
              <CardDescription>Adjust the probability of card rarities globally.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>UR (Ultra Rare) Chance</Label>
                  <span className="font-mono text-yellow-400">{dropRate}%</span>
                </div>
                <Slider 
                  defaultValue={[2]} 
                  max={10} 
                  step={0.1} 
                  onValueChange={(val) => setDropRate(val)}
                  className="[&>.relative>.absolute]:bg-yellow-500"
                />
                <p className="text-xs text-muted-foreground">Current: 1 in {Math.round(100/dropRate[0])} pulls</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>SSR (Super Rare) Chance</Label>
                  <span className="font-mono text-purple-400">12%</span>
                </div>
                <Slider defaultValue={[12]} max={30} step={1} className="[&>.relative>.absolute]:bg-purple-500" />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" /> Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SYSTEM TAB */}
        <TabsContent value="system">
           <Card className="bg-card/40 border-white/10">
             <CardHeader>
               <CardTitle>System Configuration</CardTitle>
               <CardDescription>Technical settings and maintenance controls.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
               <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                 <div>
                   <h4 className="font-bold">Maintenance Mode</h4>
                   <p className="text-xs text-muted-foreground">Only Admins can access the app.</p>
                 </div>
                 <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
               </div>

               <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                 <div>
                   <h4 className="font-bold">New User Registration</h4>
                   <p className="text-xs text-muted-foreground">Allow new users to sign up.</p>
                 </div>
                 <Switch defaultChecked />
               </div>

               <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                 <div>
                   <h4 className="font-bold flex items-center gap-2">
                     <Coins className="h-4 w-4 text-yellow-400" />
                     Token Shop
                   </h4>
                   <p className="text-xs text-muted-foreground">Enable token purchases. Disable for beta launch.</p>
                   {!tokenShopEnabled && (
                     <p className="text-xs text-yellow-400 mt-1">Currently disabled - Token Shop hidden from navigation</p>
                   )}
                 </div>
                 <Switch 
                   checked={tokenShopEnabled} 
                   onCheckedChange={handleTokenShopToggle}
                   disabled={updateSiteSetting.isPending}
                   data-testid="switch-token-shop"
                 />
               </div>

               <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                 <div>
                   <h4 className="font-bold">Debug Logs</h4>
                   <p className="text-xs text-muted-foreground">Show detailed error logs in console.</p>
                 </div>
                 <Switch />
               </div>

               <div className="pt-6">
                 <Button variant="outline" className="text-red-500 border-red-500/50 hover:bg-red-500/10 w-full">
                   Reset Entire Database (Dev Only)
                 </Button>
               </div>
             </CardContent>
           </Card>
        </TabsContent>

      </Tabs>
      
      {/* Two-Layer Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmation.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmation({ isOpen: false, step: 1, card: null, confirmText: "" });
          }
        }}
      >
        <DialogContent className="bg-card border-red-500/30">
          {deleteConfirmation.step === 1 && deleteConfirmation.card && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Warning: Users Own This Card
                </DialogTitle>
                <DialogDescription className="pt-4 space-y-4">
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-red-300 font-bold mb-2">
                      {deleteConfirmation.card.ownerCount} user{deleteConfirmation.card.ownerCount > 1 ? 's' : ''} currently own{deleteConfirmation.card.ownerCount === 1 ? 's' : ''} "{deleteConfirmation.card.name}"
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Deleting this card will permanently remove it from their collections. They paid tokens (possibly purchased with real money) for this card.
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-yellow-300 font-bold mb-2">Recommended: Archive Instead</p>
                    <p className="text-sm text-muted-foreground">
                      Archiving removes the card from the gacha pool so new users can't get it, but existing owners keep their cards. This is the safe option.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmation({ isOpen: false, step: 1, card: null, confirmText: "" })}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => {
                    handleArchiveCard(deleteConfirmation.card);
                    setDeleteConfirmation({ isOpen: false, step: 1, card: null, confirmText: "" });
                  }}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Instead (Safe)
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => setDeleteConfirmation({ ...deleteConfirmation, step: 2 })}
                >
                  I Understand, Continue to Delete
                </Button>
              </DialogFooter>
            </>
          )}
          
          {deleteConfirmation.step === 2 && deleteConfirmation.card && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                  Final Confirmation Required
                </DialogTitle>
                <DialogDescription className="pt-4 space-y-4">
                  <div className="p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                    <p className="text-red-300 font-bold text-lg mb-2">
                      This action CANNOT be undone!
                    </p>
                    <ul className="text-sm text-red-200 space-y-1">
                      <li>• {deleteConfirmation.card.ownerCount} users will lose this card permanently</li>
                      <li>• Any marketplace listings will be deleted</li>
                      <li>• Users may request refunds or report this as a scam</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      Type the card name exactly to confirm: <span className="text-red-400 font-bold">{deleteConfirmation.card.name}</span>
                    </Label>
                    <Input 
                      placeholder="Type card name here..."
                      value={deleteConfirmation.confirmText}
                      onChange={(e) => setDeleteConfirmation({ ...deleteConfirmation, confirmText: e.target.value })}
                      className="border-red-500/30"
                    />
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmation({ ...deleteConfirmation, step: 1 })}
                >
                  Go Back
                </Button>
                <Button 
                  variant="destructive"
                  disabled={deleteConfirmation.confirmText !== deleteConfirmation.card.name || deleteCard.isPending}
                  onClick={() => handleConfirmDelete(deleteConfirmation.card, true)}
                >
                  {deleteCard.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Permanently Delete Card
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Card Schedule Dialog */}
      <Dialog open={scheduleDialog.isOpen} onOpenChange={(open) => setScheduleDialog({ ...scheduleDialog, isOpen: open })}>
        <DialogContent className="bg-card border-cyan-500/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-400">
              <Calendar className="h-5 w-5" />
              Schedule & Pool Settings
            </DialogTitle>
            <DialogDescription className="pt-2">
              {scheduleDialog.card && (
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg mb-4">
                  <img src={scheduleDialog.card.image} alt={scheduleDialog.card.name} className="h-12 w-12 rounded-lg object-cover" />
                  <div>
                    <p className="font-bold text-white">{scheduleDialog.card.name}</p>
                    <p className="text-xs text-muted-foreground">{scheduleDialog.card.character} • {scheduleDialog.card.anime}</p>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={scheduleDialog.status}
                onChange={(e) => setScheduleDialog({...scheduleDialog, status: e.target.value as any})}
              >
                <option value="active">Active (Available Now)</option>
                <option value="scheduled">Scheduled (Future Release)</option>
                <option value="draft">Draft (Not Visible)</option>
              </select>
            </div>
            
            {scheduleDialog.status === 'scheduled' && (
              <div className="space-y-2">
                <Label>Release Date & Time *</Label>
                <Input 
                  type="datetime-local"
                  value={scheduleDialog.scheduledReleaseDate}
                  onChange={(e) => setScheduleDialog({...scheduleDialog, scheduledReleaseDate: e.target.value})}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
            
            <div className="space-y-3">
              <Label>Gacha Pools & Availability Dates</Label>
              <div className="space-y-3">
                {['daily', 'weekly', 'monthly', 'event'].map((pool) => {
                  const isEnabled = scheduleDialog.obtainableFrom.includes(pool);
                  const poolDate = scheduleDialog.poolDates[pool] || { start: '', end: '' };
                  return (
                    <div key={pool} className={`p-3 rounded-lg border transition-colors ${
                      isEnabled ? 'bg-cyan-500/10 border-cyan-400/30' : 'bg-transparent border-white/10'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              const pools = checked
                                ? [...scheduleDialog.obtainableFrom, pool]
                                : scheduleDialog.obtainableFrom.filter(p => p !== pool);
                              const newPoolDates = { ...scheduleDialog.poolDates };
                              if (!checked) {
                                delete newPoolDates[pool];
                              }
                              setScheduleDialog({...scheduleDialog, obtainableFrom: pools, poolDates: newPoolDates});
                            }}
                          />
                          <span className={`text-sm font-medium ${isEnabled ? 'text-cyan-300' : 'text-muted-foreground'}`}>
                            {pool.charAt(0).toUpperCase() + pool.slice(1)} Pool
                          </span>
                        </div>
                      </div>
                      {isEnabled && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Start Date</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              value={poolDate.start}
                              onChange={(e) => {
                                const newPoolDates = {
                                  ...scheduleDialog.poolDates,
                                  [pool]: { ...poolDate, start: e.target.value }
                                };
                                setScheduleDialog({...scheduleDialog, poolDates: newPoolDates});
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">End Date</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              value={poolDate.end}
                              min={poolDate.start}
                              onChange={(e) => {
                                const newPoolDates = {
                                  ...scheduleDialog.poolDates,
                                  [pool]: { ...poolDate, end: e.target.value }
                                };
                                setScheduleDialog({...scheduleDialog, poolDates: newPoolDates});
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Set date ranges for each pool. Leave empty for always available.</p>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <div>
                <Label>Limited/Event Card</Label>
                <p className="text-xs text-muted-foreground">Show special badge</p>
              </div>
              <Switch
                checked={scheduleDialog.isLimited}
                onCheckedChange={(checked) => setScheduleDialog({...scheduleDialog, isLimited: checked})}
              />
            </div>
            
            {scheduleDialog.isLimited && (
              <div className="space-y-2">
                <Label>Event/Season Name</Label>
                <Input 
                  placeholder="e.g. Summer 2024, Halloween Event" 
                  value={scheduleDialog.season}
                  onChange={(e) => setScheduleDialog({...scheduleDialog, season: e.target.value})}
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setScheduleDialog({...scheduleDialog, isOpen: false})}>
              Cancel
            </Button>
            <Button 
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={handleSaveSchedule}
              disabled={updateCard.isPending || (scheduleDialog.status === 'scheduled' && !scheduleDialog.scheduledReleaseDate)}
            >
              {updateCard.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Premium Grant Dialog */}
      <Dialog open={premiumDialog.isOpen} onOpenChange={(open) => setPremiumDialog({ ...premiumDialog, isOpen: open })}>
        <DialogContent className="bg-card border-yellow-500/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-500">
              <Crown className="h-5 w-5" />
              {premiumDialog.user?.isPremium ? 'Edit S-Class Access' : 'Grant S-Class Status'}
            </DialogTitle>
            <DialogDescription className="pt-4 space-y-4">
              {premiumDialog.user && (
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={premiumDialog.user.avatar} />
                    <AvatarFallback>{premiumDialog.user.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white">{premiumDialog.user.name}</p>
                    <p className="text-sm text-muted-foreground">{premiumDialog.user.handle}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div>
                  <Label className="text-white font-medium">Temporary Access</Label>
                  <p className="text-xs text-muted-foreground">Set an expiration date for S-Class access</p>
                </div>
                <Switch
                  checked={premiumDialog.isTemporary}
                  onCheckedChange={(checked) => setPremiumDialog({ ...premiumDialog, isTemporary: checked })}
                />
              </div>
              
              {premiumDialog.isTemporary && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Start Date</Label>
                    <Input 
                      type="date"
                      value={premiumDialog.startDate}
                      onChange={(e) => setPremiumDialog({ ...premiumDialog, startDate: e.target.value })}
                      className="border-yellow-500/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">End Date</Label>
                    <Input 
                      type="date"
                      value={premiumDialog.endDate}
                      onChange={(e) => setPremiumDialog({ ...premiumDialog, endDate: e.target.value })}
                      className="border-yellow-500/30"
                      min={premiumDialog.startDate}
                    />
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPremiumDialog({ ...premiumDialog, isOpen: false })}
            >
              Cancel
            </Button>
            <Button 
              className="bg-yellow-500 text-black hover:bg-yellow-400"
              disabled={premiumDialog.isTemporary && !premiumDialog.endDate}
              onClick={handleGrantPremium}
            >
              <Crown className="h-4 w-4 mr-2" />
              {premiumDialog.user?.isPremium 
                ? (premiumDialog.isTemporary ? 'Update Dates' : 'Make Permanent') 
                : (premiumDialog.isTemporary ? 'Grant Temporary S-Class' : 'Grant Permanent S-Class')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
