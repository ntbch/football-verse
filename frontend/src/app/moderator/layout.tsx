import { ModeratorShell } from "./_shell";

export default function ModeratorLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ModeratorShell>{children}</ModeratorShell>;
}
