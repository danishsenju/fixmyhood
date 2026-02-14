import { MainProviders } from "@/components/Providers";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainProviders>{children}</MainProviders>;
}
