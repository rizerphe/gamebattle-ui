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
      className="bg-opacity-70 flex flex-row items-center justify-center rounded-md cursor-pointer p-4 font-bold bg-gray-500 hover:bg-gray-400 transition-all hover:scale-105"
    >
      {children}
    </Link>
  ) : (
    <span
      className={`bg-opacity-70 flex flex-row items-center justify-center rounded-md cursor-pointer p-4 font-bold transition-all ${
        disabled
          ? "bg-gray-700 text-gray-500"
          : "bg-gray-500 hover:bg-gray-400 hover:scale-105"
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </span>
  );
}
