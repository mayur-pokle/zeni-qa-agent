import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QA Monitor",
  description: "Multi-project QA monitoring platform for Webflow websites"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
