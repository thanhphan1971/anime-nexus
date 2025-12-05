import { useParams } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MoreVertical, Phone, Video, Hash, Users } from "lucide-react";
import { CURRENT_USER } from "@/lib/mockData";

export default function ChatPage() {
  const { id } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, user: "System", content: "Welcome to the Attack on Titan HQ! Please read the rules before posting.", time: "10:00 AM", system: true },
    { id: 2, user: "ErenFan99", content: "Did anyone see the latest episode??", time: "10:05 AM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eren" },
    { id: 3, user: "MikasaStan", content: "The animation was insane! 🔥", time: "10:06 AM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mikasa" },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setMessages([
      ...messages,
      { 
        id: messages.length + 1, 
        user: CURRENT_USER.name, 
        content: message, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: CURRENT_USER.avatar
      }
    ]);
    setMessage("");
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-card/30 border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl">
      {/* Chat Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Hash className="text-primary" />
          </div>
          <div>
            <h2 className="font-bold">Attack on Titan HQ</h2>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> 1,243 Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon"><Users className="h-5 w-5" /></Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            msg.system ? (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="bg-white/5 text-muted-foreground text-xs px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            ) : (
              <div key={msg.id} className={`flex gap-3 ${msg.user === CURRENT_USER.name ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={msg.avatar} />
                  <AvatarFallback>{msg.user[0]}</AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[70%] ${msg.user === CURRENT_USER.name ? "items-end" : "items-start"}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-foreground">{msg.user}</span>
                    <span className="text-[10px] text-muted-foreground/60">{msg.time}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-sm ${
                    msg.user === CURRENT_USER.name 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-white/10 rounded-tl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-card/50 border-t border-white/10">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..." 
            className="bg-white/5 border-white/10 focus:border-primary"
          />
          <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90">
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
