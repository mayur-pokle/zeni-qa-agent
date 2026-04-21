import { Prisma, ProjectStatus, RunStatus, Environment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { ProjectListFilters } from "@/lib/types";

let schemaReadyPromise: Promise<void> | null = null;

async function ensureDatabaseSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = Promise.resolve();
  }

  await schemaReadyPromise;
}

export async function getOrCreateDemoUser() {
  await ensureDatabaseSchema();
  return prisma.user.upsert({
    where: { email: process.env.DEMO_USER_EMAIL ?? "owner@example.com" },
    update: {},
    create: {
      email: process.env.DEMO_USER_EMAIL ?? "owner@example.com"
    }
  });
}

export async function listProjects(filters: ProjectListFilters = {}) {
  const user = await getOrCreateDemoUser();

  const where: Prisma.ProjectWhereInput = {
    userId: user.id,
    AND: [
      filters.search
        ? {
            OR: [
              { name: { contains: filters.search } },
              { stagingUrl: { contains: filters.search } },
              { productionUrl: { contains: filters.search } }
            ]
          }
        : {},
      filters.monitoring === "active"
        ? { monitoringActive: true }
        : filters.monitoring === "inactive"
          ? { monitoringActive: false }
          : {},
      filters.issueState === "issues"
        ? { status: { in: [ProjectStatus.WARNING, ProjectStatus.DOWN] } }
        : filters.issueState === "healthy"
          ? { status: ProjectStatus.HEALTHY }
          : {}
    ]
  };

  return prisma.project.findMany({
    where,
    include: {
      qaRuns: {
        orderBy: { startedAt: "desc" },
        take: 3
      },
      lighthouseReports: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      uptimeLogs: {
        orderBy: { checkedAt: "desc" },
        take: 2
      }
    },
    orderBy:
      filters.sort === "createdAt"
        ? { createdAt: "desc" }
        : { lastRunAt: "desc" }
  });
}

export async function createProject(input: {
  name: string;
  stagingUrl?: string | null;
  productionUrl: string;
  monitoringActive?: boolean;
  monitoringIntervalMinutes?: number;
  notifyOnCompletion?: boolean;
}) {
  const user = await getOrCreateDemoUser();
  const slugBase = slugify(input.name);
  let slug = slugBase;
  let counter = 1;

  while (await prisma.project.findUnique({ where: { slug } })) {
    counter += 1;
    slug = `${slugBase}-${counter}`;
  }

  return prisma.project.create({
    data: {
      name: input.name,
      slug,
      stagingUrl: input.stagingUrl || null,
      productionUrl: input.productionUrl,
      monitoringActive: input.monitoringActive ?? true,
      monitoringIntervalMinutes: input.monitoringIntervalMinutes ?? 360,
      notifyOnCompletion: input.notifyOnCompletion ?? true,
      userId: user.id
    }
  });
}

export async function updateProject(
  projectId: string,
  input: Partial<{
    name: string;
    stagingUrl: string | null;
    productionUrl: string;
    monitoringActive: boolean;
    monitoringIntervalMinutes: number;
    notifyOnCompletion: boolean;
    status: ProjectStatus;
    performanceScore: number | null;
    lastRunAt: Date | null;
    healthScore: number;
  }>
) {
  return prisma.project.update({
    where: { id: projectId },
    data: input
  });
}

export async function deleteProject(projectId: string) {
  return prisma.project.delete({
    where: { id: projectId }
  });
}

export async function duplicateProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId }
  });

  return createProject({
    name: `${project.name} Copy`,
    stagingUrl: project.stagingUrl,
    productionUrl: project.productionUrl,
    monitoringActive: false
  });
}

export async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      qaRuns: {
        orderBy: { startedAt: "desc" },
        take: 20
      },
      lighthouseReports: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      uptimeLogs: {
        orderBy: { checkedAt: "desc" },
        take: 50
      },
      errorLogs: {
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });
}

export async function storeQaRun(input: {
  projectId: string;
  environment: Environment;
  status: RunStatus;
  performanceScore: number;
  seoScore: number;
  accessibility: number;
  payload: Prisma.InputJsonValue;
}) {
  const run = await prisma.qaRun.create({
    data: {
      ...input,
      completedAt: new Date()
    }
  });

  const status =
    input.status === RunStatus.FAILED
      ? ProjectStatus.WARNING
      : input.performanceScore < 60
        ? ProjectStatus.WARNING
        : ProjectStatus.HEALTHY;

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      status,
      performanceScore: input.performanceScore,
      lastRunAt: new Date(),
      healthScore: Math.max(
        0,
        Math.round((input.performanceScore + input.seoScore + input.accessibility) / 3)
      )
    }
  });

  return run;
}

export async function storeLighthouseReport(input: {
  projectId: string;
  environment: Environment;
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  reportPath: string;
}) {
  const report = await prisma.lighthouseReport.create({
    data: input
  });

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      performanceScore: input.performanceScore
    }
  });

  return report;
}

export async function storeUptimeLog(input: {
  projectId: string;
  environment: Environment;
  isUp: boolean;
  statusCode?: number;
  responseMs?: number;
  errorDetails?: string;
}) {
  const log = await prisma.uptimeLog.create({
    data: input
  });

  await prisma.project.update({
    where: { id: input.projectId },
    data: {
      status: input.isUp ? ProjectStatus.HEALTHY : ProjectStatus.DOWN
    }
  });

  if (!input.isUp) {
    await prisma.errorLog.create({
      data: {
        projectId: input.projectId,
        environment: input.environment,
        source: "uptime",
        severity: "critical",
        message: input.errorDetails ?? "Downtime detected"
      }
    });
  }

  return log;
}
