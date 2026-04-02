import { Skeleton } from '@/components/ui/skeleton';

export default function DevolucaoLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-brand-black px-6 py-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <Skeleton className="h-12 w-full max-w-md" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-brand-gray-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-44" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
