import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flowtest Backend",
  description: "Backend runtime for Flowtest QA monitoring"
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
