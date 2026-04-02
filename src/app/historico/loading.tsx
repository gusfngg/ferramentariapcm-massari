import { Skeleton } from '@/components/ui/skeleton';

export default function HistoricoLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-brand-black px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-3 rounded-2xl border border-brand-gray-border bg-white p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
