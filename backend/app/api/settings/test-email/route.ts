import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { readConnectionSettings } from "@/lib/app-settings";

function pick(value: unknown, fallback: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function pickPassword(value: unknown, fallback: string) {
  const stripped = String(value ?? "").replace(/\s+/g, "");
  return stripped || fallback;
}

async function testViaResend(options: {
  apiKey: string;
  from: string;
  to: string;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: "QA Monitor test email (via Resend)",
        text: "Resend HTTP API connection test succeeded."
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json(
        { error: `Resend API returned HTTP ${response.status}${detail ? `: ${detail}` : ""}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Test email sent to ${options.to} via Resend.`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = /abort/i.test(message) ? " (Request timed out after 15s.)" : "";
    return NextResponse.json(
      { error: `Resend test failed: ${message}${hint}` },
      { status: 400 }
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const envSettings = readConnectionSettings();

    const resendApiKey = pick(body.resendApiKey, envSettings.resendApiKey);
    const smtpFrom = pick(body.smtpFrom, envSettings.smtpFrom);
    const resendFrom = pick(body.resendFrom, envSettings.resendFrom);
    const alertEmail = pick(body.alertEmail, envSettings.alertEmail);

    // If a Resend key exists (form or env), prefer it — Railway-friendly.
    if (resendApiKey) {
      if (!alertEmail) {
        return NextResponse.json(
          { error: "ALERT_EMAIL is required when using Resend." },
          { status: 400 }
        );
      }
      // Resend enforces sender domain verification. Only use a custom
      // from-address when the user has explicitly set RESEND_FROM
      // (indicating they verified that domain). Otherwise fall back to
      // Resend's shared onboarding address, which works without DNS setup.
      return await testViaResend({
        apiKey: resendApiKey,
        from: resendFrom || "QA Monitor <onboarding@resend.dev>",
        to: alertEmail
      });
    }

    // Otherwise fall back to SMTP (works locally; blocked on Railway Hobby).
    const smtpHost = pick(body.smtpHost, envSettings.smtpHost);
    const smtpPortRaw = pick(body.smtpPort, envSettings.smtpPort);
    const smtpPort = Number(smtpPortRaw);
    const smtpUser = pick(body.smtpUser, envSettings.smtpUser);
    const smtpPassword = pickPassword(body.smtpPassword, envSettings.smtpPassword);
    const smtpSecure =
      body.smtpSecure === undefined ? envSettings.smtpSecure : Boolean(body.smtpSecure) || smtpPort === 465;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !alertEmail) {
      return NextResponse.json(
        {
          error:
            "Missing email settings. Either set RESEND_API_KEY (recommended on Railway) or provide SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and ALERT_EMAIL."
        },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000
    });

    try {
      await transporter.verify();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const hint =
        /etimedout|econnrefused|connection timeout|greeting never received/i.test(message)
          ? " (Railway blocks outbound SMTP on Hobby plans. Set RESEND_API_KEY to use Resend's HTTP API instead.)"
          : "";
      return NextResponse.json(
        { error: `SMTP connection failed: ${message}${hint}` },
        { status: 400 }
      );
    }

    await transporter.sendMail({
      from: smtpFrom || smtpUser,
      to: alertEmail,
      subject: "QA Monitor test email",
      text: "SMTP connection test succeeded."
    });

    return NextResponse.json({ message: `Test email sent to ${alertEmail} via SMTP.` });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Email test failed: ${error.message}`
            : "Email test failed."
      },
      { status: 400 }
    );
  }
}
