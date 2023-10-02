import Image from "next/image";

export default function YourStats() {
  return (
    <div className="bg-white text-gray-600 bg-opacity-80 p-4 flex flex-col gap-2">
      <span className="font-bold text-4xl flex flex-row items-center justify-start gap-2">
        Your stats
      </span>
      <div className="flex flex-col gap-2">
        <Image src="/widget.png" alt="Widget" width={256} height={256} />
        <span className="font-bold text-red-800">
          Competition not yet started.
        </span>
      </div>
    </div>
  );
}
