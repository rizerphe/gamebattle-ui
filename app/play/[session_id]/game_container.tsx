export default function GameContainer({
  name,
  children,
}: {
  name: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 bg-gray-800 rounded-lg">
      <span className="text-2xl font-bold p-4">{name}</span>
      {children}
    </div>
  );
}
