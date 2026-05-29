import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-[5rem] font-extrabold leading-none tracking-tight grad-text mb-3">
          404
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          We couldn't find that page
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          The link may be broken, the page may have moved, or it just hasn't
          been built yet. Head back to the feed and pick up where you left off.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full"
          >
            <Link href="/community">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to the feed
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/about">About Baingers</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
