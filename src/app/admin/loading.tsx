import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-brand-black px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="h-8 w-56" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="space-y-3 rounded-2xl border border-brand-gray-border bg-white p-4">
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
