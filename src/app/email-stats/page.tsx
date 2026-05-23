import PageHeader from "@/components/PageHeader";
import EmailStatsView from "./EmailStatsView";

export const dynamic = "force-dynamic";

export default function EmailStatsPage() {
  return (
    <div>
      <PageHeader
        title="Email Stats"
        subtitle="Opens, clicks, and bounces from your campaigns — grouped by sector, company, and contact."
      />
      <EmailStatsView />
    </div>
  );
}
