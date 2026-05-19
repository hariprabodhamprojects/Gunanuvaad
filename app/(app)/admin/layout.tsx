import { AdminSubnav } from "@/components/admin/admin-subnav";
import { requireOrganizer } from "@/lib/auth/require-organizer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOrganizer();

  return (
    <div className="layout-wide space-y-6">
      <AdminSubnav />
      {children}
    </div>
  );
}
