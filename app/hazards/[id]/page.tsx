import { Suspense } from "react";
import type { Metadata } from "next";
import { HazardScreen, HazardSkeleton } from "./hazard-screen";

export const metadata: Metadata = { title: "Xavf" };

// params are awaited inside <Suspense> so the shell can be prerendered (cacheComponents).
export default function HazardPage({ params }: PageProps<"/hazards/[id]">) {
  return (
    <Suspense fallback={<HazardSkeleton />}>
      <Hazard params={params} />
    </Suspense>
  );
}

async function Hazard({ params }: Pick<PageProps<"/hazards/[id]">, "params">) {
  const { id } = await params;
  return <HazardScreen id={id} />;
}
