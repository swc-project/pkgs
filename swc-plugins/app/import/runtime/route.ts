import { db } from "@/lib/prisma";
import { createCaller } from "@/lib/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const VersionSchema = z.object({
  version: z.string(),
  swcCoreVersion: z.string(),
});

const BodySchema = z.object({
  runtime: z.enum(["@swc/core", "next", "rspack"]),
  versions: z.array(VersionSchema),
});

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "Not allowed",
      },
      {
        status: 403,
      }
    );
  }

  const { runtime, versions } = BodySchema.parse(await req.json());

  const rt = await db.swcRuntime.findUniqueOrThrow({
    where: {
      name: runtime,
    },
  });
  const api = await createCaller();

  const items: {
    runtimeId: bigint;
    version: string;
    compatRangeId: bigint;
    swcCoreVersion: string;
  }[] = [];

  for (const version of versions) {
    const compatRange = await api.compatRange.byVersion({
      version: version.swcCoreVersion,
    });
    if (!compatRange) {
      console.log(`No compat range found for ${version.swcCoreVersion}`);
      continue;
    }

    items.push({
      runtimeId: rt.id,
      // Just to ensure it's a valid semver
      version: version.version.replace("v", ""),
      compatRangeId: compatRange.id,
      // Just to ensure it's a valid semver
      swcCoreVersion: version.swcCoreVersion.replace("v", ""),
    });
  }

  await db.swcRuntimeVersion.createMany({
    data: items,
  });

  return NextResponse.json({
    ok: true,
  });
}
