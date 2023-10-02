import Link from "next/link";

export default function Button({
  href,
  onClick,
  children,
  disabled,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return href && !disabled ? (
    <Link
      href={href}
      className="flex flex-row items-center justify-center rounded-md bg-gray-700 cursor-pointer p-4 hover:bg-gray-600 font-bold"
    >
      {children}
    </Link>
  ) : (
    <span
      className={`flex flex-row items-center justify-center rounded-md cursor-pointer p-4 font-bold ${
        disabled ? "bg-gray-800 text-gray-600" : "bg-gray-600 hover:bg-gray-600"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </span>
  );
}
