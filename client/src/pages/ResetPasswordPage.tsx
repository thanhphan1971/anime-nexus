import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, X } from "lucide-react";
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
import { getSupabase } from "@/lib/supabaseClient";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Request timed out. Please try the reset link again."));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      try {
        setIsPreparing(true);
        setPageError("");

        const supabase = await getSupabase();

        console.log("[RESET] page opened", {
          href: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
        });

        await new Promise((resolve) => setTimeout(resolve, 700));

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log("[RESET] getSession result", {
          hasSession: !!session,
          error: error?.message ?? null,
        });

        if (error) {
          throw error;
        }

        if (!session) {
          throw new Error(
            "No recovery session found. Please open the reset link from your email again."
          );
        }

        if (mounted) {
          setIsPreparing(false);
        }
      } catch (err: any) {
        console.error("[RESET] prepareRecoverySession failed", err);

        if (mounted) {
          setPageError(
            err?.message ||
              "This reset link is invalid or expired. Please request a new one."
          );
          setIsPreparing(false);
        }
      }
    }

    prepareRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPreparing || isSubmitting) return;

    setPageError("");

    if (password !== confirmPassword) {
      setPageError("Passwords do not match.");
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setPageError("Password must be at least 6 characters.");
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSubmitting(true);

      const supabase = await getSupabase();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("[RESET] before updateUser", {
        hasSession: !!session,
        sessionError: sessionError?.message ?? null,
      });

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        throw new Error(
          "No active recovery session found. Please reopen the reset link from your email."
        );
      }

      const { error } = await withTimeout(
        supabase.auth.updateUser({ password }),
        15000
      );

      console.log("[RESET] updateUser finished", {
        hasError: !!error,
        errorMessage: error?.message ?? null,
      });

      if (error) {
        throw error;
      }

      toast.success("Password updated successfully");
      setLocation("/");
    } catch (err: any) {
      console.error("[RESET] submit failed", err);
      const message =
        err?.message || "Failed to update password. Please try again.";
      setPageError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3"
          onClick={() => setLocation("/")}
          aria-label="Close reset password"
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isPreparing ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Preparing your reset session...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {pageError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {pageError}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLocation("/")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || isPreparing}
                >
                  {isSubmitting ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
