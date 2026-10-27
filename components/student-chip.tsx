import type { StudentProfile } from "@/lib/api";
import { studentLabels } from "@/lib/display-name";
import StudentAvatar from "@/components/student-avatar";

export type StudentChipProfile = Pick<
  StudentProfile,
  "email" | "username" | "photo"
> | null;

const AVATAR = "shrink-0 rounded-full bg-zinc-800 object-cover";

const SIZE = {
  sm: { avatar: `h-4 w-4 ${AVATAR}`, gap: "gap-1.5", text: "text-xs", caption: "text-[10px]" },
  md: { avatar: `h-8 w-8 ${AVATAR}`, gap: "gap-3", text: "text-sm", caption: "text-xs" },
  lg: { avatar: `h-11 w-11 ${AVATAR}`, gap: "gap-3", text: "text-sm", caption: "text-xs" },
};

export function StudentChip({
  id,
  profile = null,
  gameName,
  caption,
  size = "md",
  className = "",
}: {
  id: string;
  profile?: StudentChipProfile;
  gameName?: string | null;
  caption?: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const { primary, secondary, mono } = studentLabels(profile, gameName, id);
  const styles = SIZE[size];
  return (
    <div className={`flex min-w-0 items-center ${styles.gap} ${className}`} title={id}>
      <StudentAvatar
        src={profile?.photo}
        name={profile?.username ?? profile?.email ?? gameName ?? id}
        id={id}
        className={styles.avatar}
      />
      <span className="min-w-0">
        {caption ? <span className={`block ${styles.caption} text-zinc-500`}>{caption}</span> : null}
        <span className={`block truncate ${styles.text} text-zinc-100 ${mono ? "font-mono" : ""}`}>
          {primary}
        </span>
        {secondary ? (
          <span className="block truncate text-xs text-zinc-500">{secondary}</span>
        ) : null}
      </span>
    </div>
  );
}
