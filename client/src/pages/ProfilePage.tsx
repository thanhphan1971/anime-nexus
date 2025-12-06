import { useParams } from "wouter";
import { CURRENT_USER, USERS, POSTS } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, MapPin, Link as LinkIcon, Calendar } from "lucide-react";

export default function ProfilePage() {
  const { id } = useParams();
  
  // In a real app, fetch based on ID. Here we fallback to current user if ID matches, or one of mock users
  const profileUser = id === CURRENT_USER.id 
    ? CURRENT_USER 
    : USERS.find(u => u.id === id) || CURRENT_USER;

  // Filter posts for this user
  const userPosts = POSTS.filter(p => p.userId === profileUser.id || (profileUser.id === CURRENT_USER.id && p.userId === "u2")); // Hack to show some posts for current user

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-48 md:h-64 w-full rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-secondary opacity-80" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        {/* Profile Info Overlay */}
        <div className="px-4 md:px-8 relative -mt-16 md:-mt-20 flex flex-col md:flex-row items-end md:items-end gap-6">
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-4 border-background overflow-hidden shadow-2xl bg-background">
            <img src={profileUser.avatar} alt={profileUser.name} className="h-full w-full object-cover" />
          </div>
          
          <div className="flex-1 pb-2 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-1">
              <h1 className="text-3xl font-display font-bold">{profileUser.name}</h1>
              <Badge variant="secondary" className="w-fit mx-auto md:mx-0 bg-primary/20 text-primary border-primary/50">
                Lvl. {profileUser.stats?.level || 42}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">{profileUser.handle}</p>
          </div>

          <div className="flex gap-3 pb-4 w-full md:w-auto">
            {profileUser.id === CURRENT_USER.id ? (
              <Button variant="outline" className="flex-1 md:flex-none border-white/10">
                <Settings className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            ) : (
              <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90">
                Follow
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bio & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
           <Card className="bg-card/50 border-white/5">
             <CardContent className="p-4 space-y-4">
               <div>
                 <h3 className="font-bold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Bio</h3>
                 <p className="text-sm leading-relaxed">{profileUser.bio}</p>
               </div>
               
               <div className="space-y-2 text-sm text-muted-foreground">
                 <div className="flex items-center gap-2">
                   <MapPin className="h-4 w-4" /> Neo Tokyo, Sector 7
                 </div>
                 <div className="flex items-center gap-2">
                   <LinkIcon className="h-4 w-4" /> anirealm.net/neokai
                 </div>
                 <div className="flex items-center gap-2">
                   <Calendar className="h-4 w-4" /> Joined Dec 2077
                 </div>
               </div>

               <div>
                 <h3 className="font-bold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Badges</h3>
                 <div className="flex flex-wrap gap-2">
                   {(profileUser.badges || ["Newbie"]).map((badge: string) => (
                     <Badge key={badge} variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                       {badge}
                     </Badge>
                   ))}
                 </div>
               </div>
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
              {userPosts.length > 0 ? (
                userPosts.map(post => (
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
                            <span className="text-muted-foreground text-xs">{post.timestamp}</span>
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
                  No transmission records found.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="media">
               <div className="grid grid-cols-3 gap-2">
                 {[1,2,3,4,5,6].map(i => (
                   <div key={i} className="aspect-square bg-muted rounded-md overflow-hidden">
                      <img src={`https://picsum.photos/seed/${i + 100}/300/300`} className="w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity" alt="media" />
                   </div>
                 ))}
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
