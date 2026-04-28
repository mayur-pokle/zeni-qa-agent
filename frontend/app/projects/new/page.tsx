import Link from "next/link";
import { PageChrome } from "@/components/ui/page-chrome";
import { Card, CardBody } from "@/components/ui/card";
import { ProjectForm } from "@/components/project-form";
import { getCurrentUserEmail, requireAuthenticatedRoute } from "@/lib/session";

export default async function NewProjectPage() {
  await requireAuthenticatedRoute();
  const userEmail = await getCurrentUserEmail();

  return (
    <PageChrome
      userEmail={userEmail}
      breadcrumb={
        <span>
          <Link href="/" className="hover:text-ink">
            Projects
          </Link>
          <span className="mx-1.5 text-ink-3">/</span>
          New
        </span>
      }
      title="Create project"
      subtitle="Register a site, attach it to monitoring, and prepare it for sitemap-based QA."
    >
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardBody>
            <ProjectForm mode="create" />
          </CardBody>
        </Card>
      </div>
    </PageChrome>
  );
}
