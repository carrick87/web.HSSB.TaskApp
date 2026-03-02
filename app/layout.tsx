import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskApp — Harrison Sabah",
  description: "Internal task management for Harrison Sabah Sdn Bhd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
