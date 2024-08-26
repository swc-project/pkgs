import fs from "node:fs/promises";

export default async function Page() {
  if (process.env.NODE_ENV === "production") {
    return <div>Not allowed</div>;
  }

  const plugins = JSON.parse(
    await fs.readFile("./data/.cache/plugins.json", "utf8")
  );
}

export const dynamic = "force-dynamic";
