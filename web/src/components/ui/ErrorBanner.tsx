"use client";
export default function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className={`mb-3 rounded-md border px-3 py-2 text-xs`}
         style={{ borderColor: 'color-mix(in oklab, red 30%, transparent)', background: 'color-mix(in oklab, red 10%, transparent)', color: 'red' }}>
      {message}
    </div>
  );
}
