export default async function Page({
  params: { version },
}: {
  params: { version: string };
}) {
  // TODO: Reverse mapping from plugin runner version to swc version
  return (
    <div>
      <h1>swc_plugin_runner: {version}</h1>
    </div>
  );
}
