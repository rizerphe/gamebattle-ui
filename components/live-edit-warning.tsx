export default function LiveEditWarning({ className }: { className?: string }) {
  return (
    <span className={className}>
      You&apos;re editing another player&apos;s game. Every save lands in their
      latest snapshot. This is a live environment.{" "}
      <span className="text-green-400">Be careful!</span>
    </span>
  );
}
