export default function DetailsLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-7 w-16 animate-pulse rounded bg-default" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-24 animate-pulse rounded bg-default" />
            <div className="h-12 animate-pulse rounded-xl bg-default" />
          </div>
        ))}
      </div>
    </div>
  );
}
