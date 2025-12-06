import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BarChart, Users, Database, Sparkles, Calendar, Plus, Upload, Save } from "lucide-react";

export default function AdminPage() {
  const [dropRate, setDropRate] = useState([2]); // 2% UR rate
  const [promoActive, setPromoActive] = useState(false);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-display font-bold text-red-500 mb-2">GAME MASTER CONTROL</h1>
           <p className="text-muted-foreground">Manage the economy, cards, and events of the Realm.</p>
        </div>
        <Badge variant="outline" className="border-red-500 text-red-500 animate-pulse">
          ADMIN ACCESS GRANTED
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: "12,450", icon: Users, color: "text-blue-400" },
          { label: "Cards in Circulation", value: "84,302", icon: Database, color: "text-purple-400" },
          { label: "Active Trades", value: "1,240", icon: Sparkles, color: "text-yellow-400" },
          { label: "Daily Revenue", value: "$4,200", icon: BarChart, color: "text-green-400" },
        ].map((stat, i) => (
          <Card key={i} className="bg-card/40 border-white/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase">{stat.label}</p>
                <p className="text-2xl font-bold font-mono">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color} opacity-50`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="economy" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/10 p-1 mb-6">
          <TabsTrigger value="economy" className="flex-1">Economy & Drop Rates</TabsTrigger>
          <TabsTrigger value="cards" className="flex-1">Card Management</TabsTrigger>
          <TabsTrigger value="events" className="flex-1">Events & Promos</TabsTrigger>
        </TabsList>

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
                <Button className="bg-red-500 hover:bg-red-600 text-white">
                  <Save className="mr-2 h-4 w-4" /> Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CARDS TAB */}
        <TabsContent value="cards">
           <Card className="bg-card/40 border-white/10">
             <CardHeader>
               <CardTitle>Create New Card</CardTitle>
               <CardDescription>Add a new collectible to the global pool.</CardDescription>
             </CardHeader>
             <CardContent className="grid md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <div className="space-y-2">
                   <Label>Card Name</Label>
                   <Input placeholder="e.g. Celestial Guardian" className="bg-white/5 border-white/10" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Rarity</Label>
                     <select className="w-full bg-white/5 border border-white/10 rounded-md h-10 px-3 text-sm">
                       <option>Common</option>
                       <option>Rare</option>
                       <option>SSR</option>
                       <option>UR</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <Label>Type</Label>
                     <Input placeholder="e.g. Magic" className="bg-white/5 border-white/10" />
                   </div>
                 </div>
                 <Button className="w-full bg-primary hover:bg-primary/90">
                   <Upload className="mr-2 h-4 w-4" /> Upload Artwork
                 </Button>
               </div>

               <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-black/20 p-8 text-muted-foreground">
                  <p className="text-sm">Preview will appear here</p>
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        {/* EVENTS TAB */}
        <TabsContent value="events">
          <Card className="bg-card/40 border-white/10">
            <CardHeader>
              <CardTitle>Active Events</CardTitle>
              <CardDescription>Manage limited-time promotions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                 <div className="flex items-center gap-4">
                   <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                     <Sparkles className="h-5 w-5" />
                   </div>
                   <div>
                     <h4 className="font-bold">Golden Week: Double XP</h4>
                     <p className="text-xs text-muted-foreground">Ends in 2 days</p>
                   </div>
                 </div>
                 <Switch checked={promoActive} onCheckedChange={setPromoActive} />
               </div>

               <Button variant="outline" className="w-full border-dashed border-white/20 h-16 hover:bg-white/5">
                 <Plus className="mr-2 h-4 w-4" /> Schedule New Event
               </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
