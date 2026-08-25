import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PawPrint, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-lg mx-auto text-center border-none shadow-xl shadow-black/5 rounded-2xl bg-card">
        <CardContent className="p-8 sm:p-12 space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <PawPrint className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-bold uppercase tracking-wider text-accent">404 Error</span>
            <h1 className="text-3xl font-bold font-display text-foreground">Page Not Found</h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              We couldn't find the page you're looking for. It might have been moved, deleted, or the URL might be mistyped.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/">
              <Button className="w-full sm:w-auto bg-[#1F4E79] hover:bg-[#1F4E79]/90 text-white font-semibold rounded-xl h-11 px-6 gap-2 shadow-lg shadow-[#1F4E79]/20">
                <Home className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-xl h-11 px-6 gap-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
