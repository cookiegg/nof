"use client";
import LeaderboardOverview from "@/components/leaderboard/LeaderboardOverview";

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6">
      <div className="mx-auto w-full max-w-7xl">
        <LeaderboardOverview />
      </div>
    </main>
  );
}
