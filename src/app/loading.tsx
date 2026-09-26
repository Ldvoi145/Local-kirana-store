export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="rounded-2xl bg-leaf-deep/90 px-5 py-5 sm:px-6 animate-pulse">
        <div className="h-7 w-2/3 rounded bg-white/20" />
        <div className="mt-2 h-4 w-1/2 rounded bg-white/15" />
      </div>
      <div className="space-y-3">
        <div className="h-6 w-40 rounded bg-ink/10 animate-pulse" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="rounded-2xl bg-counter border border-line p-5 space-y-2 animate-pulse"
            >
              <div className="h-5 w-3/4 rounded bg-ink/10" />
              <div className="h-4 w-1/2 rounded bg-ink/10" />
              <div className="h-4 w-1/3 rounded bg-ink/10" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
