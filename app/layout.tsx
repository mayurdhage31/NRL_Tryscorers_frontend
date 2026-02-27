import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wicky AI — NRL Tryscorers",
  description: "Ask me anything about NRL try scoring stats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
