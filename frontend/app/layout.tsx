import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import PwaRegistrar from "@components/PwaRegistrar";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Studious",
    template: "%s | Studious",
  },
  description: "AI-powered study planning, focus tracking, and performance insights.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0a1816",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Studious",
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
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${poppins.className} min-h-full flex flex-col`}>
        <PwaRegistrar />
        {children}
      </body>
    </html>
  );
}
