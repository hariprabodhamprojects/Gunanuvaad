/**
 * Route group `(marketing)` — public landing (`/`) and `/login` → `/` redirect.
 * Parentheses mean this segment does NOT appear in the URL.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-1 flex-col">{children}</div>
  );
}
