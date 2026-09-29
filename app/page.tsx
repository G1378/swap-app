import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-primary-dark">swap-app</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
        Trade what you have for what you want.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        List something you no longer use, say what you would take in return,
        and swap with someone who has it. Starting with gaming, LEGO, cameras,
        instruments and PC parts.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/feed" className={cn(buttonVariants({ size: "lg" }))}>
          Browse the feed
        </Link>
        <Link
          href="/publish"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          List an item
        </Link>
      </div>
    </main>
  );
}
