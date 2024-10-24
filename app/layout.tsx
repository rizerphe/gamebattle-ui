import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NavBar from "./navbar";
import Providers from "./providers";
import InteractiveDotBackground from "./background";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gamebattle",
  description: "Side by side game competition",
};

function Content({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-fit flex-1">
      {children}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col items-stretch min-h-screen h-fit relative">
          <div className="fixed object-cover inset-0 z-[-1]">
            <InteractiveDotBackground />
          </div>
          <NavBar />
          <Providers>
            <Content>{children}</Content>
          </Providers>
        </div>
      </body>
    </html>
  );
}
