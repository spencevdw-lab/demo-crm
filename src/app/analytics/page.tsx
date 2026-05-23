import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import AnalyticsCharts from "./AnalyticsCharts";
import EmailStatsView from "../email-stats/EmailStatsView";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({ select: { status: true, createdAt: true, sector: true } }),
    prisma.company.findMany({
      select: {
        name: true,
        industry: true,
        _count: { select: { contacts: true } },
      },
    }),
  ]);

  // Status distribution
  const statusCountsMap = new Map<string, number>();
  contacts.forEach((c) => {
    statusCountsMap.set(c.status, (statusCountsMap.get(c.status) ?? 0) + 1);
  });
  const statusData = Array.from(statusCountsMap.entries()).map(
    ([name, value]) => ({ name, value }),
  );

  // Monthly contact growth (last 6 months)
  const now = new Date();
  const monthBuckets: { label: string; key: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthBuckets.push({
      label: d.toLocaleString("en-GB", { month: "short" }),
      key,
      count: 0,
    });
  }
  const bucketIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));
  contacts.forEach((c) => {
    const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const i = bucketIndex.get(key);
    if (i !== undefined) monthBuckets[i].count += 1;
  });

  // Contacts by sector
  const sectorMap = new Map<string, number>();
  contacts.forEach((c) => {
    const s = c.sector?.trim() || "Unclassified";
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + 1);
  });
  const sectorData = Array.from(sectorMap.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);

  // Top companies by contacts
  const topCompanies = companies
    .map((c) => ({ name: c.name, industry: c.industry, contacts: c._count.contacts }))
    .sort((a, b) => b.contacts - a.contacts)
    .slice(0, 8);

  const customerCount = contacts.filter((c) => c.status === "CUSTOMER").length;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Email engagement, contact mix, and account insights."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Contacts"
          value={formatNumber(contacts.length)}
          hint={`${formatNumber(customerCount)} customers`}
        />
        <StatCard
          label="Companies"
          value={formatNumber(companies.length)}
          hint="Accounts in your CRM"
        />
        <StatCard
          label="Sectors"
          value={formatNumber(sectorData.filter((s) => s.sector !== "Unclassified").length)}
          hint="Distinct sectors tracked"
        />
      </div>

      <AnalyticsCharts
        statusData={statusData}
        monthlyContacts={monthBuckets.map((b) => ({ month: b.label, contacts: b.count }))}
        sectorData={sectorData.slice(0, 8)}
      />

      {/* Top accounts */}
      <div className="card mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Top Accounts by Contacts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="table-th">Company</th>
                <th className="table-th">Sector</th>
                <th className="table-th">Contacts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topCompanies.map((c) => (
                <tr key={c.name}>
                  <td className="table-td font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="table-td">{c.industry || "—"}</td>
                  <td className="table-td tabular-nums">{formatNumber(c.contacts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email engagement tree */}
      <div className="mt-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Email Engagement
        </h2>
        <EmailStatsView />
      </div>
    </div>
  );
}
