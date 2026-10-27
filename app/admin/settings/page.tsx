import PhasesSection from "./phases-section";
import WebhooksSection from "./webhooks-section";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-8 py-10">
      <PhasesSection />
      <WebhooksSection />
    </div>
  );
}
