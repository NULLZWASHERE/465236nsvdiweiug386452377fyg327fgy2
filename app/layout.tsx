import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zekoro — Free Disposable Email",
  description:
    "Generate instant, free disposable email addresses at zekoro.fun. No signup required. Protect your privacy online.",
  keywords: ["disposable email", "temp mail", "temporary email", "zekoro", "free email"],
  openGraph: {
    title: "Zekoro — Free Disposable Email",
    description: "Instant disposable emails. No signup. 100% free.",
    url: "https://zekoro.fun",
    siteName: "Zekoro",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="noise">{children}</body>
    </html>
  );
}
