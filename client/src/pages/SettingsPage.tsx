import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, Loader2, AtSign, Clock, AlertCircle, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCheckHandle, useUpdateHandle } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [newHandle, setNewHandle] = useState("");
  const [debouncedHandle, setDebouncedHandle] = useState("");
  
  const { data: handleCheck, isLoading: checkingHandle } = useCheckHandle(debouncedHandle);
  const updateHandle = useUpdateHandle();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHandle(newHandle.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    }, 500);
    return () => clearTimeout(timer);
  }, [newHandle]);

  const currentHandle = user?.handle?.replace('@', '') || '';
  const handleChangedAt = user?.handleChangedAt ? new Date(user.handleChangedAt) : null;
  const daysSinceChange = handleChangedAt 
    ? Math.floor((Date.now() - handleChangedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const canChangeHandle = daysSinceChange === null || daysSinceChange >= 30;
  const daysUntilChange = daysSinceChange !== null ? Math.max(0, 30 - daysSinceChange) : 0;

  const handleSubmit = async () => {
    if (!user || !newHandle) return;
    
    try {
      await updateHandle.mutateAsync({
        userId: user.id,
        handle: newHandle,
      });
      await refreshUser();
      setNewHandle("");
      toast.success("Handle updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update handle");
    }
  };

  const isValidFormat = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(debouncedHandle);
  const isLongEnough = debouncedHandle.length >= 3;
  const isAvailable = handleCheck?.available === true;
  const canSave = isLongEnough && isValidFormat && isAvailable && canChangeHandle && debouncedHandle !== currentHandle;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/profile">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-display">Settings</h1>
      </div>

      {/* Email Display */}
      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Your Email
          </CardTitle>
          <CardDescription>
            The email address associated with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Email address</p>
            <p className="text-lg font-mono text-foreground" data-testid="text-user-email">{user?.email || 'Not set'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AtSign className="h-5 w-5 text-primary" />
            Your Handle
          </CardTitle>
          <CardDescription>
            Your handle is your unique profile URL. Share it as anirealm.net/@{currentHandle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current handle</p>
                <p className="text-lg font-mono text-primary">@{currentHandle}</p>
              </div>
              {handleChangedAt && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Changed {daysSinceChange} days ago
                </Badge>
              )}
            </div>
          </div>

          {!canChangeHandle && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-500">Cooldown Active</p>
                <p className="text-sm text-muted-foreground">
                  You can change your handle again in {daysUntilChange} days. 
                  This prevents abuse and protects your identity.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="handle">New Handle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="handle"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourhandle"
                className="pl-8 bg-white/5 border-white/10"
                maxLength={20}
                disabled={!canChangeHandle}
                data-testid="input-new-handle"
              />
              {debouncedHandle.length >= 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingHandle ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : isAvailable && isValidFormat ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            
            {debouncedHandle && (
              <div className="text-sm">
                {!isLongEnough && (
                  <p className="text-red-400">Handle must be at least 3 characters</p>
                )}
                {isLongEnough && !isValidFormat && (
                  <p className="text-red-400">Handle must start with a letter and contain only letters, numbers, and underscores</p>
                )}
                {isLongEnough && isValidFormat && !checkingHandle && handleCheck && !isAvailable && (
                  <p className="text-red-400">{handleCheck.reason || "Handle not available"}</p>
                )}
                {isLongEnough && isValidFormat && isAvailable && (
                  <p className="text-green-400">@{debouncedHandle} is available!</p>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button 
              onClick={handleSubmit}
              disabled={!canSave || updateHandle.isPending}
              className="w-full"
              data-testid="button-save-handle"
            >
              {updateHandle.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Handle
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Handle changes are limited to once every 30 days. Choose wisely!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
