import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  formatNumber,
  statusColor,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    companyCount,
    contactCount,
    customerCount,
    recentContacts,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.contact.count(),
    prisma.contact.count({ where: { status: "CUSTOMER" } }),
    prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true },
    }),
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { _count: { select: { contacts: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Snapshot of your contacts and accounts."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Companies"
          value={formatNumber(companyCount)}
          hint="Active accounts in your CRM"
        />
        <StatCard
          label="Contacts"
          value={formatNumber(contactCount)}
          hint={`${formatNumber(customerCount)} marked as customers`}
        />
        <StatCard
          label="Customers"
          value={formatNumber(customerCount)}
          hint="Active customer contacts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Contacts
            </h2>
            <Link
              href="/contacts"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentContacts.map((c) => (
              <li
                key={c.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {c.title ?? "—"}
                    {c.company ? ` · ${c.company.name}` : ""}
                  </div>
                </div>
                <span
                  className={`pill ${statusColor(c.status)} whitespace-nowrap`}
                >
                  {c.status}
                </span>
              </li>
            ))}
            {recentContacts.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                No contacts yet.
              </li>
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Companies
            </h2>
            <Link
              href="/companies"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentCompanies.map((c) => (
              <li
                key={c.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {c.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {c.industry || "No sector set"}
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {c._count.contacts} contact{c._count.contacts !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
            {recentCompanies.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                No companies yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
