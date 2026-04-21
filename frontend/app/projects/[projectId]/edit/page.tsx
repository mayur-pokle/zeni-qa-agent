import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import { Shell } from "@/components/shell";
import { getProjectForApp } from "@/lib/app-data";

export default async function EditProjectPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectForApp(projectId);

  if (!project) {
    notFound();
  }

  return (
    <Shell
      title={`Edit ${project.name}`}
      description="Update project URLs, rename the workspace, and control whether monitoring stays active."
    >
      <ProjectForm
        mode="edit"
        initialValues={{
          id: project.id,
          name: project.name,
          stagingUrl: project.stagingUrl,
          productionUrl: project.productionUrl,
          monitoringActive: project.monitoringActive,
          monitoringIntervalMinutes: project.monitoringIntervalMinutes,
          notifyOnCompletion: project.notifyOnCompletion
        }}
      />
    </Shell>
  );
}
