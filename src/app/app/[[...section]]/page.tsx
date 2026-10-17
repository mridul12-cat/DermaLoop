import { notFound } from "next/navigation";
import WorkspaceApp from "@/components/workspace";
export default async function AppPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  if (
    section &&
    (section.length !== 1 ||
      !["atlas", "timeline", "routine", "decision", "scan", "privacy"].includes(
        section[0],
      ))
  )
    notFound();
  return <WorkspaceApp section={section?.[0] || "atlas"} />;
}
