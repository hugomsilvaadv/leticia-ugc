import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};
import AdminEditor from "./AdminEditor";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminEditor />;
}
