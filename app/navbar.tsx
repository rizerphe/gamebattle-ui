import Image from "next/image";
import Link from "next/link";
import AccountButton from "./accountbutton";

export default function NavBar() {
  return (
    <div className="flex flex-row justify-between items-center opacity-90 bg-black px-6 py-3 shadow-sm shadow-black">
      <Link
        className="text-4xl font-bold m-4 flex flex-row justify-center items-center gap-2"
        href="/"
      >
        <Image src="/logo.png" width={50} height={50} alt="logo" />
        <span className="hidden md:block">GameBattle</span>
      </Link>
      <AccountButton />
    </div>
  );
}
