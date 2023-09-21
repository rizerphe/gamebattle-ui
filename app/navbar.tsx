import Link from "next/link";
import AccountButton from "./accountbutton";

export default function NavBar() {
  return (
    <div className="flex flex-row justify-between items-center bg-gray-800 p-6">
      <Link className="text-4xl font-bold m-4" href="/">
        GameBattle
      </Link>
      <AccountButton />
    </div>
  );
}
