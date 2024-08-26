"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

      <Table>
        <TableCaption>Runtime Version Ranges</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Runtime</TableHead>
            <TableHead>Minimum Version</TableHead>
            <TableHead>Maximum Version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compatRange.runtimes.map((runtime) => (
            <TableRow key={runtime.name}>
              <TableCell className="font-medium">{runtime.name}</TableCell>
              <TableCell>{runtime.minVersion}</TableCell>
              <TableCell>{runtime.maxVersion}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
