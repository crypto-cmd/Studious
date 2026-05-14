import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Studious | AI-Powered Study Intelligence Platform",
  description:
    "Studious combines AI, machine learning, and behavioral analytics to help students predict grades, optimize study time, and achieve more. TensorFlow-powered grade prediction, Groq LLM task decomposition, KDE focus analytics, and genetic algorithm optimization.",
  keywords: [
    "AI study planner",
    "grade prediction",
    "TensorFlow education",
    "student productivity",
    "study schedule optimizer",
    "focus tracking",
    "academic analytics",
  ],
  openGraph: {
    title: "Studious — Turn Academic Chaos into Clarity",
    description:
    "AI-powered planning, focus tracking, and grade prediction. Your personal study intelligence platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} scroll-smooth`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
