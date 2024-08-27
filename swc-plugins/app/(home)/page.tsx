"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/trpc/web-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const [runtimes] = apiClient.runtime.list.useSuspenseQuery();

  const [selectedRuntime, setSelectedRuntime] = useState<bigint>();

  return (
    <div className="flex w-full max-w-md flex-col space-y-4">
      <div className="flex space-x-4">
        <Select onValueChange={(e) => setSelectedRuntime(BigInt(e))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select runtime" />
          </SelectTrigger>
          <SelectContent>
            {runtimes.map((runtime) => (
              <SelectItem
                key={runtime.id.toString()}
                value={runtime.id.toString()}
              >
                {runtime.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedRuntime && <VersionSelector runtimeId={selectedRuntime} />}
      </div>
      <div className="flex justify-center">
        <Link href={`/versions/range`} passHref>
          <Button
            variant="secondary"
            size="default"
            className="whitespace-nowrap"
          >
            See all versions
          </Button>
        </Link>
      </div>
    </div>
  );
}

function VersionSelector({ runtimeId }: { runtimeId: bigint }) {
  const router = useRouter();
  const versions = apiClient.runtime.listVersions.useQuery({
    runtimeId,
  });

  return (
    <Select
      onValueChange={(e) => {
        const selected = versions.data?.find((v) => v.version === e);
        router.push(`/versions/range/${selected?.compatRangeId}`);
      }}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Version" />
      </SelectTrigger>
      <SelectContent>
        {versions.data?.map((version) => (
          <SelectItem key={version.version} value={version.version}>
            {version.version}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
