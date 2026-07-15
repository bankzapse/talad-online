import { Skeleton, ListingGridSkeleton } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-10">
      <Skeleton className="h-64 rounded-3xl sm:h-80" />
      <div className="grid gap-6 lg:grid-cols-[236px_1fr]">
        <div className="hidden lg:block">
          <div className="card space-y-2 p-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="mb-4 h-16 w-full rounded-2xl" />
          <ListingGridSkeleton />
        </div>
      </div>
    </div>
  );
}
