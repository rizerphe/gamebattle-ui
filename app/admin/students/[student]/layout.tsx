import { StudentAdminProvider } from "./student-admin-context";

export default function StudentAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { student: string };
}) {
  return (
    <StudentAdminProvider studentId={params.student}>
      {children}
    </StudentAdminProvider>
  );
}
