import PlaceholderGame from "./placeholder";
import Markdown from "react-markdown";

const markdown = `### Why Split Screen?
This isn't just for show - during the competition, players will be running two games side by side, each taking up exactly this much space. This view helps you develop with that in mind!

### Key Things to Know
- Your game will be pre-launched before players connect - save any fancy stuff for when they actually start playing
- Players will have different screen sizes, so that amazing ASCII art might not look the same for everyone
- Aim for a quick but clear introduction - help players understand how to play without overwhelming them

### Pro Tips
- If your game works well in this split view, you're golden
- Try the full-screen button to test different sizes
- Keep it simple and robust!

### File limitations
To keep the platform running, we have some limitations to what you can do with your files:
- Each file can be up to 128KB
- There can be up to 64 files in your game
- Filenames can only contain English letters, numbers, ".", "-", "_", and " ".

### Using Display Libraries?
If you're using curses or similar tools:
- Screen size starts at 80x24, updates on connect
- Expect some size changes in the first second
- Test your display at different sizes

### Technical Info for Nerds
- Your game runs in a Docker container with 40MB of RAM
- The container is a plain ARM64 python:3.12-alpine image
- All of your files are stored in /usr/src/app
- A full tty is connected to your game, and the output is streamed with websockets and displayed with [xterm.js](https://xtermjs.org/)
- The game output is preserved server-side, allowing for refreshes without losing the game state; but the data stored is limited to 16MB - after that, the game will be killed. This still allows for a solid few minutes of cmatrix, so you shouldn't run into any issues.

Remember: A game that runs smoothly is way better than one that's flashy but temperamental. **Have fun creating! 🎮**`;

export default function Tips() {
  return (
    <PlaceholderGame name="Welcome to the Game Development Tips! 👋">
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 overflow-auto">
          <div className="p-4 prose prose-invert min-w-full">
            <Markdown>{markdown}</Markdown>
          </div>
        </div>
      </div>
    </PlaceholderGame>
  );
}
