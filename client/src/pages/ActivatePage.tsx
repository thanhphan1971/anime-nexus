import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ActivatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <h1 
            className="text-2xl font-bold mb-4"
            data-testid="text-activate-title"
          >
            Create your AniRealm account to activate S-Class
          </h1>
          
          <p 
            className="text-muted-foreground mb-8"
            data-testid="text-activate-description"
          >
            Your subscription is active. Create your account using the same email to unlock S-Class benefits.
          </p>
          
          <Link href="/signup">
            <Button 
              className="w-full mb-4"
              size="lg"
              data-testid="button-create-account"
            >
              Create Account
            </Button>
          </Link>
          
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-primary hover:underline"
              data-testid="link-sign-in"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
