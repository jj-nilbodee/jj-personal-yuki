// Shown instantly on navigation while the server renders the page, and lets
// <Link> prefetch every dynamic route up to this boundary. The nav in the
// layout stays put; only the page area is replaced.
export default function Loading() {
  return (
    <div className="grid gap-6 motion-safe:animate-pulse" role="status" aria-label="Loading">
      <div className="mx-auto h-11 w-40 rounded-full bg-tile" />
      <div className="card h-40" />
      <div className="card h-24" />
      <div className="card h-64" />
    </div>
  );
}
