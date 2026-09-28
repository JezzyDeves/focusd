import type { Metadata, Viewport } from "next";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/vt323/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "focusd",
  description: "A hacker-terminal Pomodoro timer.",
};

export const viewport: Viewport = {
  themeColor: "#030705",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="focus">
      <body>{children}</body>
    </html>
  );
}
