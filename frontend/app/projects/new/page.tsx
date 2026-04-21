import { Shell } from "@/components/shell";
import { ProjectForm } from "@/components/project-form";

export default function NewProjectPage() {
  return (
    <Shell
      title="Create Project"
      description="Register staging and production targets, attach them to the monitoring pipeline, and prepare them for sitemap-based QA."
    >
      <ProjectForm mode="create" />
    </Shell>
  );
}
