import localFont from "next/font/local";
import { Toaster } from "sonner";
import "driver.js/dist/driver.css";
import "./globals.css";

const satre = localFont({ src: "./fonts/satre.ttf", variable: "--font-satre", display: "swap" });
const regular = localFont({ src: "./fonts/regular.otf", variable: "--font-regular", display: "swap" });

export const metadata = {
  title: { default: "Privacy Auditor — DPDP", template: "%s · Privacy Auditor" },
  description: "Audit website trackers, cookie banners and privacy notices against India's DPDP Act, 2023.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${satre.variable} ${regular.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-right" toastOptions={{ className: "pa-toast" }} />
      </body>
    </html>
  );
}
