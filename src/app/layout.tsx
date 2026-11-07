import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "CourseForge",
  title: {
    default: "CourseForge | Lesson Studio",
    template: "%s | CourseForge",
  },
  description: "Research, draft, quality-check, and export focused 45-minute lessons.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "472x472" }],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "472x472" }],
  },
  openGraph: {
    type: "website",
    siteName: "CourseForge",
    title: "CourseForge | Lesson Studio",
    description: "Research, draft, quality-check, and export focused 45-minute lessons.",
    images: [{ url: "/courseforge-logo.png", width: 472, height: 472, alt: "CourseForge" }],
  },
  twitter: {
    card: "summary",
    title: "CourseForge | Lesson Studio",
    description: "Research, draft, quality-check, and export focused 45-minute lessons.",
    images: ["/courseforge-logo.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
