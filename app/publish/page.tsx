import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublishForm } from "@/components/publish/PublishForm";

export const metadata = {
  title: "List an item \u2014 swap-app",
};

export default function PublishPage() {
  return (
    <div className="mx-auto max-w-xl px-4">
      <header className="flex items-center gap-2 py-4">
        <Link
          href="/"
          aria-label="Back to home"
          className="grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">List an item</h1>
      </header>
      <PublishForm />
    </div>
  );
}
