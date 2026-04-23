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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const envSettings = readConnectionSettings();

    const smtpHost = pick(body.smtpHost, envSettings.smtpHost);
    const smtpPortRaw = pick(body.smtpPort, envSettings.smtpPort);
    const smtpPort = Number(smtpPortRaw);
    const smtpUser = pick(body.smtpUser, envSettings.smtpUser);
    const smtpPassword = pickPassword(body.smtpPassword, envSettings.smtpPassword);
    const smtpFrom = pick(body.smtpFrom, envSettings.smtpFrom);
    const alertEmail = pick(body.alertEmail, envSettings.alertEmail);
    const smtpSecure =
      body.smtpSecure === undefined ? envSettings.smtpSecure : Boolean(body.smtpSecure) || smtpPort === 465;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !alertEmail) {
      return NextResponse.json(
        {
          error:
            "Missing required Gmail SMTP values. Provide them in the form or set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and ALERT_EMAIL in the environment."
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
      }
    });

    await transporter.verify();

    await transporter.sendMail({
      from: smtpFrom || smtpUser,
      to: alertEmail,
      subject: "QA Monitor test email",
      text: "SMTP connection test succeeded."
    });

    return NextResponse.json({ message: `Test email sent to ${alertEmail}.` });
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
