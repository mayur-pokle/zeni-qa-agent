import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const smtpHost = String(body.smtpHost ?? "").trim();
    const smtpPort = Number(body.smtpPort ?? 0);
    const smtpUser = String(body.smtpUser ?? "").trim();
    const smtpPassword = String(body.smtpPassword ?? "").replace(/\s+/g, "");
    const smtpFrom = String(body.smtpFrom ?? "").trim();
    const alertEmail = String(body.alertEmail ?? "").trim();

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !alertEmail) {
      return NextResponse.json({ error: "Fill the Gmail fields first." }, { status: 400 });
    }

    const secure = Boolean(body.smtpSecure) || smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
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

    return NextResponse.json({ message: "Test email sent successfully." });
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
