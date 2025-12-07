import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Users, Database, Sparkles, Calendar, Plus, Upload, Save, 
  ShieldAlert, Ban, UserCheck, MessageSquare, Flag, Trash2, Settings, 
  Activity, Crown, Lock, Unlock, Eye
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

export default function AdminPage() {
  const [dropRate, setDropRate] = useState([2]); // 2% UR rate
  const [promoActive, setPromoActive] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Mock Data for Admin
  const USERS_LIST = [
    { id: 1, name: "NeoKai", handle: "@neokai", status: "Active", role: "User", joined: "2023-12-01" },
    { id: 2, name: "CyberRogue", handle: "@rogue", status: "Banned", role: "User", joined: "2024-01-15" },
    { id: 3, name: "AdminUser", handle: "@admin", status: "Active", role: "Admin", joined: "2023-11-20" },
    { id: 4, name: "MechaAce", handle: "@mecha", status: "Active", role: "S-Class", joined: "2024-02-10" },
  ];

  const COMMUNITIES_LIST = [
    { id: 1, name: "Shonen General", members: 1240, type: "Public", status: "Active" },
    { id: 2, name: "Romance Cafe", members: 850, type: "Public", status: "Active" },
    { id: 3, name: "Jujutsu Kaisen Spoilers", members: 320, type: "Public", status: "Locked" },
    { id: 4, name: "S-Class VIP Lounge", members: 45, type: "Private", status: "Active" },
  ];

  const FLAGGED_CONTENT = [
    { id: 1, user: "ToxicGamer", reason: "Harassment", content: "You are all noobs...", time: "10m ago" },
    { id: 2, user: "SpamBot9000", reason: "Spam", content: "Buy cheap tokens at...", time: "1h ago" },
  ];

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
          <Card className="bg-card/40 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles, bans, and permissions.</CardDescription>
              </div>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Invite Admin</Button>
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
                    {USERS_LIST.map((user) => (
                      <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div>{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.handle}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'Admin' ? 'destructive' : user.role === 'S-Class' ? 'default' : 'secondary'} 
                            className={user.role === 'S-Class' ? 'bg-yellow-500 text-black' : ''}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-2 text-xs ${user.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.joined}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-yellow-400">
                              <Crown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-500">
                              <Ban className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                    {COMMUNITIES_LIST.map((room) => (
                      <TableRow key={room.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-bold">{room.name}</TableCell>
                        <TableCell>{room.type}</TableCell>
                        <TableCell>{room.members}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={room.status === 'Active' ? 'text-green-400 border-green-400' : 'text-yellow-400 border-yellow-400'}>
                            {room.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {room.status === 'Locked' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
