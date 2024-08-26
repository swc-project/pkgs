"use client";

import { apiClient } from "@/lib/trpc/web-client";

export default function Page({
  params: { compatRangeId },
}: {
  params: { compatRangeId: string };
}) {
  const [compatRange] = apiClient.compatRange.get.useSuspenseQuery({
    id: BigInt(compatRangeId),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">
        <kbd>swc_core</kbd>@<kbd>{compatRange.from}</kbd> -{" "}
        <kbd>{compatRange.to}</kbd>
      </h1>

      <h2 className="text-xl font-bold">Runtimes</h2>
      <ul>
        {compatRange.runtimes.map((runtime) => (
          <li key={runtime.name}>
            <kbd>{runtime.name}</kbd>
            <kbd>{runtime.minVersion}</kbd> - <kbd>{runtime.maxVersion}</kbd>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-bold">Plugins</h2>
      <ul>
        {compatRange.plugins.map((plugin) => (
          <li key={plugin.name}>
            <kbd>{plugin.name}</kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const dynamic = "force-dynamic";
