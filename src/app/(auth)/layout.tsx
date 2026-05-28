import { Toaster } from "@/components/ui/sonner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
      <footer className="text-muted-foreground border-t py-4 text-center text-xs">
        Secretaría Municipal del Distrito Central · Alcaldía Municipal del Distrito Central
      </footer>
      <Toaster richColors closeButton position="top-center" />
    </div>
  );
}
