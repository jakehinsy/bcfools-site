import type { Metadata } from "next";
import { Oswald, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://brewcityfools.com"),
  title: {
    default: "Brew City F.O.O.L.S. | Duty. Pride. Tradition.",
    template: "%s | Brew City F.O.O.L.S.",
  },
  description:
    "Firefighters from across the region coming together to train, share hard-earned lessons, and carry forward the traditions of the fire service.",
  keywords: [
    "Brew City FOOLS",
    "firefighter training",
    "Milwaukee firefighters",
    "Wisconsin fire service",
    "FOOLS International",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Brew City F.O.O.L.S.",
    title: "Brew City F.O.O.L.S. | Duty. Pride. Tradition.",
    description:
      "Firefighters coming together to train, share stories, and carry the traditions of the fire service forward.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Brew City F.O.O.L.S. — Built on brotherhood. Driven by training.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brew City F.O.O.L.S.",
    description:
      "Firefighters coming together to train, share stories, and carry the traditions of the fire service forward.",
    images: ["/og.png"],
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
      className={`${sourceSans.variable} ${oswald.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
