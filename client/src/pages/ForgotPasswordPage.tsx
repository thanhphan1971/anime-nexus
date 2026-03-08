import { useState } from "react";
import { useLocation } from "wouter";
import { createClient } from "@supabase/supabase-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://anime-nexus.replit.app/reset-password",
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || "Failed to send reset email");
      return;
    }

    toast.success("Password reset email sent. Check your inbox.");
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we’ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset email"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/")}
            >
              Back to login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}