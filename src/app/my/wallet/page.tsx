import { getCurrentStudent } from "@/lib/student-auth";
import { redirect } from "next/navigation";
import { WalletHome } from "@/components/wallet/WalletHome";

export default async function MyWalletPage() {
  const student = await getCurrentStudent();
  if (!student) redirect("/login");
  return (
    <main className="wallet-page">
      <WalletHome />
    </main>
  );
}
