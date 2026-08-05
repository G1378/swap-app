export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="container flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>&copy; {new Date().getFullYear()} SwapApp. Trade smarter, not harder.</p>
        <p>Built with Next.js &amp; Supabase.</p>
      </div>
    </footer>
  );
}
