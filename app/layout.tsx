import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NavBar from "@/components/navbar";
import Providers from "@/components/providers";
import InteractiveDotBackground from "@/components/background";
import AccessWarning from "@/components/access-warning";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gamebattle",
  description: "Side by side game competition",
};

function Content({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center flex-1 p-4 gap-4 min-h-fit">
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
      <body className={cn(inter.className, "bg-black dark")}>
        <div className="relative flex flex-col items-stretch min-h-screen h-fit">
          <div className="fixed object-cover inset-0 z-[-1]">
            <InteractiveDotBackground />
          </div>
          <NavBar />
          <Providers>
            <AccessWarning />
            <Content>{children}</Content>
            <Toaster />
          </Providers>
        </div>
      </body>
    </html>
  );
}
