import { Suspense } from "react";
import { DetailsClient } from "@/components/bookkeeping/DetailsClient";

export default function DetailsPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">明细</h1>
      <Suspense fallback={<DetailsSkeleton />}>
        <DetailsClient />
      </Suspense>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-24 animate-pulse rounded bg-default" />
          <div className="h-12 animate-pulse rounded-xl bg-default" />
        </div>
      ))}
    </div>
  );
}
