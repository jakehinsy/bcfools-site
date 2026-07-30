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
    "Fire-service brotherhood, hands-on training, and community support for firefighters across Milwaukee and southeastern Wisconsin.",
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
      "Brotherhood, hands-on training, and community support for southeastern Wisconsin's fire service.",
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
      "Brotherhood, hands-on training, and community support for southeastern Wisconsin's fire service.",
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
