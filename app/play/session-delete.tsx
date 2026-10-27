import Link from "next/link";

export default function SessionDeleteButton({
  children,
}: {
  children: JSX.Element;
}) {
  return <Link href="/">{children}</Link>;
}
