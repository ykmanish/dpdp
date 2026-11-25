"use client";
import { AuthProvider } from "@/lib/auth";
import { AppShell, TourProvider } from "@/components/shell";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <TourProvider>
        <AppShell>{children}</AppShell>
      </TourProvider>
    </AuthProvider>
  );
}
