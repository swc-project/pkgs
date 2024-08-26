"use client";

import { apiClient } from "@/lib/trpc/web-client";
import Link from "next/link";

export default function Page({
  params: { version },
}: {
  params: { version: string };
}) {
  const [compatRange] = apiClient.compatRange.byVersion.useSuspenseQuery({
    version,
  });

  return (
    <div>
      {compatRange ? (
        <>
          <Link href={`/compat/range/${compatRange.id}`}>
            {compatRange.from} ~ {compatRange.to}
          </Link>
        </>
      ) : (
        <>
          <p>No compat range found</p>
        </>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
