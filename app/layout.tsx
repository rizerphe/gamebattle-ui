import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NavBar from "./navbar";
import Image from "next/image";

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
          <Image
            src="/bg.png"
            alt=""
            objectFit="cover"
            layout="fill"
            className="absolute inset-0 z-[-1]"
          />
          <NavBar />
          <Content>{children}</Content>
        </div>
      </body>
    </html>
  );
}
