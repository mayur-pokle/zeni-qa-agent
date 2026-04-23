import { NextRequest, NextResponse } from "next/server";
import { readConnectionSettings } from "@/lib/app-settings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const envSettings = readConnectionSettings();

    const webhookUrl = String(body.slackWebhookUrl ?? "").trim() || envSettings.slackWebhookUrl;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            "No Slack webhook URL provided and SLACK_WEBHOOK_URL is not set in the environment."
        },
        { status: 400 }
      );
    }

    if (!/^https:\/\/hooks\.slack\.com\//i.test(webhookUrl)) {
      return NextResponse.json(
        { error: "Webhook URL must start with https://hooks.slack.com/." },
        { status: 400 }
      );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: ":white_check_mark: *QA Monitor test* — Slack webhook is reachable."
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Slack webhook returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Slack test message posted successfully." });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Slack test failed: ${error.message}`
            : "Slack test failed."
      },
      { status: 400 }
    );
  }
}
