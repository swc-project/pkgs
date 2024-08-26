import { createCaller } from "@/lib/server";
import Link from "next/link";

export default async function Page() {
  const api = await createCaller();
  const ranges = await api.compatRange.list();

  return (
    <div>
      <h1 className="text-2xl font-bold">Compat Ranges</h1>
      <ul>
        {ranges.map((range) => (
          <li key={range.id}>
            <Link href={`/compat/range/${range.id}`}>
              <kbd>swc_core</kbd>@<kbd>{range.from}</kbd> -{" "}
              <kbd>{range.to}</kbd>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
