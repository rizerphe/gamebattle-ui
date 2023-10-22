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
      <div className="flex flex-row justify-between items-start gap-6 m-6">
        <span className="text-2xl font-bold m-0">{name}</span>
        <div className="flex-grow" />
        {tooling}
      </div>
      {children}
    </>
  );
}
