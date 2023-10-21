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
    <>
      <div className="flex flex-row justify-between items-center gap-2 m-4">
        <span className="text-2xl font-bold m-2">{name}</span>
        <div className="flex-grow" />
        {tooling}
      </div>
      {children}
    </>
  );
}
