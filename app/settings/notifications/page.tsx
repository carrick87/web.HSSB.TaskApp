import { requireOrgContext } from "@/lib/org/context";
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm";

export default async function NotificationSettingsPage() {
  await requireOrgContext();
  return <NotificationSettingsForm />;
}
