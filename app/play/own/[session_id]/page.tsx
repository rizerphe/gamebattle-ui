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
          />
          <PlaceholderGame
            name="Tips"
            content={
              transform(`**Welcome to the Game Development Tips! 👋**

**Why am I seeing this?**
Hey there! This split screen isn't just for show - it's here to help you create an awesome game that'll work great in the competition. When players are competing, they'll be playing two games side by side, each taking up exactly this much space. Pretty neat, right?

**Getting Started**
- Here's something cool to know: your game will be pre-launched and waiting in a pool before players connect. This means super-fast loading times for them, but also means your game might be sitting idle for a while
- Got some fancy animations or dynamic elements planned? Save them for when the player actually starts playing - they'll appreciate it more!
- Remember that players will have all sorts of different screen sizes. That amazing ASCII art dragon might look perfect on your screen but could turn into a jumbled mess on someone else's
- For your game intro, think "goldilocks zone" - not too long, not too short. Players want to jump right in, but they also need to know how to play. A quick, clear explanation is your friend!

**Making the Most of This Environment**
- This split-screen view is your secret weapon - if your game shines here, it'll shine in the competition
- Feel like experimenting? Hit that full-screen button to see how your game handles different sizes. The more flexible your game is, the better!
- Always remember: what works on your screen might look different for someone else. Keep it simple and robust!

**For Advanced Display Users**
Using curses, or other terminal control libraries? This section's for you!

When using these libraries:
- The initial screen size will be reported as 80x24
- It'll update when a player connects (and might wiggle a bit in the first second)
- Your game should roll with these size changes like a champ
- Test your display handling at different sizes - what looks perfect now might need some tweaking

Remember: A game that runs smoothly is way better than one that's flashy but temperamental. Have fun creating! 🎮`) +
              `\n`
            }
          />
        </Suspense>
      </div>
    </div>
  );
}
