import { useState } from "react";
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
  Clock, Play, Pause, X, Ticket
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
import { useUsers, useBanUser, useUnbanUser, useGrantPremium, useCommunities } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { toast as sonnerToast } from "sonner";

export default function AdminPage() {
  const { toast } = useToast();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: communities, isLoading: communitiesLoading } = useCommunities();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const grantPremium = useGrantPremium();
  const [dropRate, setDropRate] = useState([2]); // 2% UR rate
  const [promoActive, setPromoActive] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const handleUpgradeUser = async (userId: string, currentPremium: boolean) => {
    if (currentPremium) {
      sonnerToast.info("User is already S-Class");
      return;
    }
    
    try {
      await grantPremium.mutateAsync(userId);
      sonnerToast.success("User upgraded to S-Class!");
    } catch (error: any) {
      sonnerToast.error(error.message || "Failed to upgrade user");
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
                              <Button 
                                variant={user.isPremium ? "secondary" : "outline"}
                                size="sm" 
                                className={`h-8 text-xs ${user.isPremium ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20' : 'border-dashed border-white/20 hover:border-yellow-500/50 hover:text-yellow-500'}`}
                                onClick={() => handleUpgradeUser(user.id, user.isPremium)}
                                data-testid={`button-upgrade-${user.id}`}
                              >
                                <Crown className="h-3 w-3 mr-1" fill={user.isPremium ? "currentColor" : "none"} />
                                Grant S-Class
                              </Button>
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
                        <Button size="xs" variant="destructive" className="h-6 text-xs">Ban</Button>
                        <Button size="xs" variant="secondary" className="h-6 text-xs">Ignore</Button>
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
    </div>
  );
}
