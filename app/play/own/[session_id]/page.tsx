import Link from "next/link";
import { Suspense } from "react";
import Games, { PlaceholderGame } from "../../games";
import GamesPlaceholder from "../../games_placeholder";
import markdownToAnsi from "markdown-to-ansi";

function DevTooling() {
  return (
    <Link href="/edit">
      <div className="flex-1 p-2 font-bold text-white text-sm bg-blue-500 rounded cursor-pointer hover:bg-blue-600">
        Return to development
      </div>
    </Link>
  );
}

export default function Play({
  params: { session_id },
}: {
  params: { session_id: string };
}) {
  const api_route = process.env.API_ROUTE;
  const api_ws_route = process.env.API_WS_ROUTE;
  if (!api_route) return <span>API_ROUTE not set</span>;
  if (!api_ws_route) return <span>API_WS_ROUTE not set</span>;

  const transform = markdownToAnsi();

  return (
    <div className="flex flex-col items-stretch flex-1 gap-4 w-full">
      <div className="flex flex-row flex-1 gap-4">
        <Suspense
          fallback={<GamesPlaceholder n_games={1} tooling={<DevTooling />} />}
        >
          <Games
            api_route={api_route}
            api_ws_route={api_ws_route}
            session_id={session_id}
            n_placeholder_games={1}
            tooling={<DevTooling />}
          >
            <PlaceholderGame
              name="Tips"
              content={
                transform(`**Welcome to the Game Development Tips! 👋**

**Why Split Screen?**
This isn't just for show - during the competition, players will be running two games side by side, each taking up exactly this much space. This view helps you develop with that in mind!

**Key Things to Know**
- Your game will be pre-launched before players connect - save any fancy stuff for when they actually start playing
- Players will have different screen sizes, so that amazing ASCII art might not look the same for everyone
- Aim for a quick but clear introduction - help players understand how to play without overwhelming them

**Pro Tips**
- If your game works well in this split view, you're golden
- Try the full-screen button to test different sizes
- Keep it simple and robust!

**File limitations**
- 128KB per file
- Up to 64 files per game
- Filenames can only contain English letters, numbers, ".", "-", "_", and " ".

**Using Display Libraries?**
If you're using curses or similar tools:
- Screen size starts at 80x24, updates on connect
- Expect some size changes in the first second
- Test your display at different sizes

Remember: A game that runs smoothly is way better than one that's flashy but temperamental. Have fun creating! 🎮`) +
                `\n`
              }
            />
          </Games>
        </Suspense>
      </div>
    </div>
  );
}
