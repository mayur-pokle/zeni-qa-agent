import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import { PageChrome } from "@/components/ui/page-chrome";
import { Card, CardBody } from "@/components/ui/card";
import { getProjectForApp } from "@/lib/app-data";
import { getCurrentUserEmail, requireAuthenticatedRoute } from "@/lib/session";

export default async function EditProjectPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await requireAuthenticatedRoute();
  const [project, userEmail] = await Promise.all([
    getProjectForApp(projectId),
    getCurrentUserEmail()
  ]);

  if (!project) {
    notFound();
  }

  return (
    <PageChrome
      userEmail={userEmail}
      breadcrumb={
        <span>
          <Link href="/" className="hover:text-ink">
            Projects
          </Link>
          <span className="mx-1.5 text-ink-3">/</span>
          <Link href={`/projects/${project.id}`} className="hover:text-ink">
            {project.name}
          </Link>
          <span className="mx-1.5 text-ink-3">/</span>
          Edit
        </span>
      }
      title={`Edit ${project.name}`}
      subtitle="Update URLs, rename the workspace, and control monitoring."
    >
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardBody>
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
          </CardBody>
        </Card>
      </div>
    </PageChrome>
  );
}
