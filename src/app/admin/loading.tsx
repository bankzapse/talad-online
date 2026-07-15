import { Skeleton } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-7 w-48" />
      <Skeleton className="mb-5 h-9 w-full max-w-md rounded-xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
