import { Dynamic } from "@/components/dynamic";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { SessionProvider } from "next-auth/react";
import { Manrope } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { PropsWithChildren } from "react";
import { ClientProviders } from "./client-providers";
import "./globals.css";

const fontHeading = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

const fontBody = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang={"en"}>
      <body
        className={cn("antialiased", fontHeading.variable, fontBody.variable)}
      >
        <NextTopLoader color={"var(--colors-primary)"} />

        <SessionProvider>
          <ClientProviders>
            <main className="flex h-screen w-full flex-col items-center justify-center align-middle">
              <Dynamic>{children}</Dynamic>
            </main>
          </ClientProviders>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
