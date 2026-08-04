import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Proof-of-Workflow",
    description: "AI evaluation based on real workflows and organizational acceptance.",
    openGraph: {
      title: "Proof-of-Workflow",
      description: "AI evaluation based on real workflows and organizational acceptance.",
      type: "article",
      images: [{ url: `${origin}/og-proof-of-workflow.png`, width: 1774, height: 887 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Proof-of-Workflow",
      description: "AI evaluation based on real workflows and organizational acceptance.",
      images: [`${origin}/og-proof-of-workflow.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
