import { redirect } from "next/navigation";

export default function StudentAdminIndex({
  params,
}: {
  params: { student: string };
}) {
  redirect(`/admin/students/${params.student}/activity`);
}
