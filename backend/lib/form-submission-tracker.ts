import { Environment } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Daily-gate state for HubSpot form submissions.
 *
 * The model exists in `prisma/schema.prisma` as `FormSubmissionLog`.
 * `prisma generate` produces the typed client during the backend's
 * postinstall step on Railway, but the local sandbox can't reach
 * binaries.prisma.sh, so we narrow the cast here. At runtime in
 * production the cast resolves to the proper typed delegate.
 */

type FormSubmissionRow = {
  id: string;
  projectId: string;
  pageUrl: string;
  environment: Environment;
  status: string;
  detail: string | null;
  submittedAt: Date;
};

type FormSubmissionDelegate = {
  findFirst(args: {
    where: { projectId: string; submittedAt?: { gte: Date } };
    orderBy?: { submittedAt: "desc" | "asc" };
  }): Promise<FormSubmissionRow | null>;
  create(args: {
    data: {
      projectId: string;
      pageUrl: string;
      environment: Environment;
      status: string;
      detail?: string | null;
    };
  }): Promise<FormSubmissionRow>;
};

function delegate(): FormSubmissionDelegate {
  return (prisma as unknown as { formSubmissionLog: FormSubmissionDelegate })
    .formSubmissionLog;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns true if no form submission has been recorded for this project
 * in the last 24h. Callers use this to decide whether the next form they
 * encounter on a page should get the deep "fill + submit" treatment.
 */
export async function shouldDeepTestForm(projectId: string): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - ONE_DAY_MS);
    const recent = await delegate().findFirst({
      where: { projectId, submittedAt: { gte: cutoff } },
      orderBy: { submittedAt: "desc" }
    });
    return recent === null;
  } catch (err) {
    // If the table genuinely doesn't exist yet (e.g., the deploy that
    // adds the model hasn't run db:push), default to "skip the deep
    // test" so we never accidentally pollute HubSpot before the gate
    // is in place.
    console.warn(
      "[form-tracker] shouldDeepTestForm failed, skipping deep test:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

export async function recordFormSubmission(input: {
  projectId: string;
  pageUrl: string;
  environment: Environment;
  status: string;
  detail?: string;
}) {
  try {
    await delegate().create({
      data: {
        projectId: input.projectId,
        pageUrl: input.pageUrl,
        environment: input.environment,
        status: input.status,
        detail: input.detail ?? null
      }
    });
  } catch (err) {
    console.warn(
      "[form-tracker] recordFormSubmission failed:",
      err instanceof Error ? err.message : err
    );
  }
}

export async function getLastSubmission(projectId: string) {
  try {
    return await delegate().findFirst({
      where: { projectId },
      orderBy: { submittedAt: "desc" }
    });
  } catch {
    return null;
  }
}
