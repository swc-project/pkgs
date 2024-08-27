"use client";

import { Checkbox } from "@/components/ui/checkbox";
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
import { useState } from "react";

export default function Page({
  params: { compatRangeId },
}: {
  params: { compatRangeId: string };
}) {
  const [includePrerelease, setIncludePrerelease] = useState(false);
  const [compatRange] = apiClient.compatRange.get.useSuspenseQuery({
    id: BigInt(compatRangeId),
    includePrerelease,
  });

  return (
    <div>
      <div className="flex flex-row justify-between">
        <h1 className="mr-10 flex flex-col text-2xl font-bold">
          <kbd>swc_core</kbd>
          <span className="text-sm">
            @<kbd>{compatRange.from}</kbd> - <kbd>{compatRange.to}</kbd>
          </span>
        </h1>

        <div>
          <Checkbox
            checked={includePrerelease}
            onCheckedChange={(v) => {
              setIncludePrerelease(!!v);
            }}
          />
          <label>Include Prerelease</label>
        </div>
      </div>

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

      <Table>
        <TableCaption>Compatible Plugins</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Plugin</TableHead>
            <TableHead>Minimum Version</TableHead>
            <TableHead>Maximum Version</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {compatRange.plugins.map((plugin) => (
            <TableRow key={plugin.name}>
              <TableCell className="font-medium">{plugin.name}</TableCell>
              <TableCell>{plugin.minVersion}</TableCell>
              <TableCell>{plugin.maxVersion}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const dynamic = "force-dynamic";
