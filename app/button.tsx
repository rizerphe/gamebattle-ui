import Link from "next/link";

export default function Button({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return href ? (
    <Link
      href={href}
      className="flex flex-row items-center justify-center rounded-md bg-gray-700 cursor-pointer p-4 hover:bg-gray-600 font-bold"
    >
      {children}
    </Link>
  ) : (
    <span
      className="flex flex-row items-center justify-center rounded-md bg-gray-700 cursor-pointer p-4 hover:bg-gray-600 font-bold"
      onClick={onClick}
    >
      {children}
    </span>
  );
}
