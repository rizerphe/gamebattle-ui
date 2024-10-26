"use client";
import GameContainer from "../../game_container";

export default function PlaceholderGame({
  name,
  tooling,
  children,
}: {
  name: string;
  tooling?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch">
      <GameContainer name={name} tooling={<>{tooling ?? null}</>}>
        {children}
      </GameContainer>
    </div>
  );
}
