import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assay — AI Quality Measurement",
  description: "Tips and disputes as training signals for AI agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
