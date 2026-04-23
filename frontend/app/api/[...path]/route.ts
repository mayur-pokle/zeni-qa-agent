import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/backend";

async function proxy(request: NextRequest): Promise<NextResponse> {
  const baseUrl = getBackendApiBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  const { pathname, search } = request.nextUrl;
  const url = `${baseUrl}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.blob() : undefined;

  const response = await fetch(url, { method: request.method, headers, body });

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
