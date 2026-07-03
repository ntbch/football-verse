import { AdminShell } from "@/shared/components/admin-shell";

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminShell>{children}</AdminShell>;
}
