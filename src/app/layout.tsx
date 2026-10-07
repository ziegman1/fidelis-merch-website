import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://fidelismerch.com";
const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;

export const metadata: Metadata = {
  title: "Fidelis Merch — Fidelis International Seminary",
  description: "Official merchandise for Fidelis International Seminary",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Fidelis International Seminary",
    description: "Official merchandise for Fidelis International Seminary",
    url: SITE_URL,
    siteName: "Fidelis Merch",
    type: "website",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: "Fidelis Merch — Fidelis International Seminary",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fidelis International Seminary",
    description: "Official merchandise for Fidelis International Seminary",
    images: [OG_IMAGE_URL],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
