import { getCurrentStudent } from "@/lib/student-auth";
import { getStudentDuties } from "@/lib/role-portals";
import { redirect } from "next/navigation";
import { WalletHome } from "@/components/wallet/WalletHome";

export default async function MyWalletPage() {
  const student = await getCurrentStudent();
  if (!student) redirect("/login");
  const duties = await getStudentDuties(student.id);
  return (
    <main className="wallet-page">
      <WalletHome duties={duties} />
    </main>
  );
}
