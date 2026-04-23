import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { readConnectionSettings } from "@/lib/app-settings";

export async function POST() {
  try {
    const settings = readConnectionSettings();
    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPassword,
      smtpFrom,
      alertEmail
    } = settings;

    const port = Number(smtpPort);

    if (!smtpHost || !port || !smtpUser || !smtpPassword || !alertEmail) {
      return NextResponse.json(
        {
          error:
            "Gmail SMTP environment variables are not fully set (need SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL)."
        },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
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
