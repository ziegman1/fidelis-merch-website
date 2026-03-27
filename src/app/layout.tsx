import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { getSiteCopy } from "@/lib/site-copy";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://ziegsonamission.com";
const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getSiteCopy();
  const name = copy.site.name;
  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: copy.site.description,
    metadataBase: new URL(SITE_URL),
    openGraph: {
      title: name,
      description: copy.site.description,
      url: SITE_URL,
      siteName: name,
      type: "website",
      images: [
        {
          url: OG_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: copy.site.description,
      images: [OG_IMAGE_URL],
    },
    icons: {
      icon: "/icon.png",
      apple: "/apple-touch-icon.png",
    },
  };
}

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
