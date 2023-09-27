export default function GameContainer({
  name,
  children,
  tooling,
}: {
  name: string;
  children?: React.ReactNode;
  tooling?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 bg-gray-800 rounded-lg items-stretch">
      <div className="flex flex-row justify-between items-center">
        <span className="text-2xl font-bold p-4">{name}</span>
        <div className="flex-grow" />
        {tooling}
      </div>
      {children}
    </div>
  );
}
