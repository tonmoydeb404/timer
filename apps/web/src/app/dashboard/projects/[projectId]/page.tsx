import { ProjectDetailClient } from "./project-detail-client";

export const metadata = {
  title: "Project",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectDetailClient projectId={projectId} />;
}
