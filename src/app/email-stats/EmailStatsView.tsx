"use client";

import { useEffect, useState } from "react";

type ContactNode = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  opens: number;
  clicks: number;
  bounces: number;
};

type CompanyNode = {
  name: string;
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  contacts: ContactNode[];
};

type SectorNode = {
  sector: string;
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  companies: CompanyNode[];
};

type Summary = {
  totalOpens: number;
  totalClicks: number;
  totalBounces: number;
  uniqueContacts: number;
  emailsTracked: number;
};

function Pill({
  value,
  type,
}: {
  value: number;
  type: "opens" | "clicks" | "bounces";
}) {
  if (value === 0) return null;
  const styles = {
    opens:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    clicks:
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
    bounces:
      "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
  };
  const labels = { opens: "open", clicks: "click", bounces: "bounce" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type]}`}
    >
      {value} {labels[type]}
      {value !== 1 ? "s" : ""}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EmailStatsView() {
  const [data, setData] = useState<{
    tree: SectorNode[];
    summary: Summary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set());
  const [openCompanies, setOpenCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/email-stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        // Auto-expand all sectors on load
        if (d.tree?.length) {
          setOpenSectors(new Set((d.tree as SectorNode[]).map((s) => s.sector)));
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  function toggleSector(sector: string) {
    setOpenSectors((prev) => {
      const next = new Set(prev);
      next.has(sector) ? next.delete(sector) : next.add(sector);
      return next;
    });
  }

  function toggleCompany(key: string) {
    setOpenCompanies((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        <svg
          className="mx-auto mb-3 h-8 w-8 animate-spin text-brand-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        Loading email stats from Brevo…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center text-sm text-rose-600 dark:text-rose-400">
        Failed to load email stats: {error ?? "Unknown error"}
      </div>
    );
  }

  const { tree, summary } = data;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.totalOpens}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Opens
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-sky-600 dark:text-sky-400">
            {summary.totalClicks}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Clicks
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {summary.totalBounces}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Bounces
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            {summary.uniqueContacts}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Contacts Reached
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Engagement by Sector
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Last 60 days · {summary.emailsTracked} events tracked
          </span>
        </div>

        {tree.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No email events found yet. Events will appear here after contacts
            open, click, or bounce your emails.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tree.map((sectorNode) => {
              const sectorOpen = openSectors.has(sectorNode.sector);
              return (
                <div key={sectorNode.sector}>
                  {/* ── SECTOR ROW ── */}
                  <button
                    className="flex w-full items-center gap-2.5 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    onClick={() => toggleSector(sectorNode.sector)}
                  >
                    <Chevron open={sectorOpen} />
                    <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {sectorNode.sector}
                    </span>
                    <span className="mr-2 text-xs text-slate-400 dark:text-slate-500">
                      {sectorNode.companies.reduce(
                        (s, c) => s + c.contacts.length,
                        0
                      )}{" "}
                      contact
                      {sectorNode.companies.reduce(
                        (s, c) => s + c.contacts.length,
                        0
                      ) !== 1
                        ? "s"
                        : ""}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Pill value={sectorNode.totalOpens} type="opens" />
                      <Pill value={sectorNode.totalClicks} type="clicks" />
                      <Pill value={sectorNode.totalBounces} type="bounces" />
                    </div>
                  </button>

                  {/* ── COMPANIES ── */}
                  {sectorOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-800/10">
                      {sectorNode.companies.map((companyNode) => {
                        const companyKey = `${sectorNode.sector}::${companyNode.name}`;
                        const companyOpen = openCompanies.has(companyKey);
                        return (
                          <div
                            key={companyNode.name}
                            className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                          >
                            {/* Company row */}
                            <button
                              className="flex w-full items-center gap-2.5 py-2.5 pl-10 pr-5 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                              onClick={() => toggleCompany(companyKey)}
                            >
                              <Chevron open={companyOpen} />
                              <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">
                                {companyNode.name}
                              </span>
                              <span className="mr-2 text-xs text-slate-400 dark:text-slate-500">
                                {companyNode.contacts.length} contact
                                {companyNode.contacts.length !== 1 ? "s" : ""}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Pill
                                  value={companyNode.totalOpens}
                                  type="opens"
                                />
                                <Pill
                                  value={companyNode.totalClicks}
                                  type="clicks"
                                />
                                <Pill
                                  value={companyNode.totalBounces}
                                  type="bounces"
                                />
                              </div>
                            </button>

                            {/* Contact rows */}
                            {companyOpen && (
                              <div className="border-t border-slate-100/60 dark:border-slate-800/60">
                                {companyNode.contacts.map((contact) => (
                                  <div
                                    key={contact.id}
                                    className="flex items-center gap-2 border-b border-slate-100/60 py-2 pl-[4.5rem] pr-5 last:border-0 dark:border-slate-800/60"
                                  >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                                      {contact.firstName} {contact.lastName}
                                      <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                                        {contact.email}
                                      </span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <Pill value={contact.opens} type="opens" />
                                      <Pill
                                        value={contact.clicks}
                                        type="clicks"
                                      />
                                      <Pill
                                        value={contact.bounces}
                                        type="bounces"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
