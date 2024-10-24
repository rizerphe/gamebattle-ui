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
      className="bg-opacity-70 flex flex-row items-center justify-center rounded-md cursor-pointer p-4 font-bold bg-gray-800 hover:bg-gray-700 transition-all relative overflow-visible"
    >
      {children}
    </Link>
  ) : (
    <span
      className={`bg-opacity-70 flex flex-row items-center justify-center rounded-md cursor-pointer p-4 font-bold transition-all relative overflow-visible ${
        disabled ? "bg-gray-950 text-gray-500" : "bg-gray-900 hover:bg-gray-800"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </span>
  );
}
