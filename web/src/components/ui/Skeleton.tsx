export function SkeletonRow({ cols = 6 }: { cols?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-2">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-3 w-24 animate-pulse rounded skeleton-bg" />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "h-64" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md skeleton-bg ${className}`} />
  );
}

// ???? <tbody> ?????
export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-2 pr-4">
          <div className="h-3 w-24 animate-pulse rounded skeleton-bg" />
        </td>
      ))}
    </tr>
  );
}
