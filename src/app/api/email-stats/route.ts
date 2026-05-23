import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";

async function fetchAllBrevoEvents(days = 60) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  const allEvents: any[] = [];
  const limit = 100;
  let offset = 0;
  const maxPages = 10; // cap at 1000 events

  for (let page = 0; page < maxPages; page++) {
    const url = new URL("https://api.brevo.com/v3/smtp/statistics/events");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("startDate", startDateStr);

    const res = await fetch(url.toString(), {
      headers: {
        "api-key": BREVO_API_KEY,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) break;

    const data = await res.json();
    const events: any[] = data.events ?? [];
    allEvents.push(...events);

    if (events.length < limit) break;
    offset += limit;
  }

  return allEvents;
}

export async function GET() {
  try {
    const [events, contacts] = await Promise.all([
      fetchAllBrevoEvents(60),
      prisma.contact.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          sector: true,
          location: true,
          company: { select: { name: true } },
        },
      }),
    ]);

    // email → contact lookup (lowercase key)
    const contactByEmail = new Map(
      contacts.map((c) => [c.email.toLowerCase(), c])
    );

    // Aggregate per-contact stats
    const statsMap = new Map<
      string,
      { opens: number; clicks: number; bounces: number }
    >();

    for (const ev of events) {
      const email = (ev.email ?? "").toLowerCase();
      if (!contactByEmail.has(email)) continue;

      let s = statsMap.get(email);
      if (!s) {
        s = { opens: 0, clicks: 0, bounces: 0 };
        statsMap.set(email, s);
      }

      const type = (ev.event ?? "").toLowerCase();
      if (type === "opened" || type === "uniqueopens" || type === "open") {
        s.opens++;
      } else if (type === "clicks" || type === "click" || type === "uniqueclicks") {
        s.clicks++;
      } else if (type.includes("bounce")) {
        s.bounces++;
      }
    }

    // Build tree: sector → company → contacts
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

    const sectorMap = new Map<string, Map<string, CompanyNode>>();

    for (const [email, stats] of statsMap.entries()) {
      const contact = contactByEmail.get(email)!;
      const sector = contact.sector?.trim() || "Unclassified";
      const companyName = contact.company?.name?.trim() || "Independent";

      let companies = sectorMap.get(sector);
      if (!companies) {
        companies = new Map();
        sectorMap.set(sector, companies);
      }

      let company = companies.get(companyName);
      if (!company) {
        company = {
          name: companyName,
          totalOpens: 0,
          totalClicks: 0,
          totalBounces: 0,
          contacts: [],
        };
        companies.set(companyName, company);
      }

      company.contacts.push({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email,
        opens: stats.opens,
        clicks: stats.clicks,
        bounces: stats.bounces,
      });
      company.totalOpens += stats.opens;
      company.totalClicks += stats.clicks;
      company.totalBounces += stats.bounces;
    }

    // Convert to sorted arrays
    const tree: SectorNode[] = [];
    let totalOpens = 0;
    let totalClicks = 0;
    let totalBounces = 0;

    for (const [sector, companies] of sectorMap.entries()) {
      const companyList = Array.from(companies.values()).sort(
        (a, b) => b.totalOpens + b.totalClicks - (a.totalOpens + a.totalClicks)
      );
      companyList.forEach((c) => {
        c.contacts.sort((a, b) => b.opens + b.clicks - (a.opens + a.clicks));
      });

      const sectorTotalOpens = companyList.reduce((s, c) => s + c.totalOpens, 0);
      const sectorTotalClicks = companyList.reduce((s, c) => s + c.totalClicks, 0);
      const sectorTotalBounces = companyList.reduce((s, c) => s + c.totalBounces, 0);

      tree.push({
        sector,
        totalOpens: sectorTotalOpens,
        totalClicks: sectorTotalClicks,
        totalBounces: sectorTotalBounces,
        companies: companyList,
      });

      totalOpens += sectorTotalOpens;
      totalClicks += sectorTotalClicks;
      totalBounces += sectorTotalBounces;
    }

    tree.sort(
      (a, b) =>
        b.totalOpens + b.totalClicks - (a.totalOpens + a.totalClicks)
    );

    return NextResponse.json({
      tree,
      summary: {
        totalOpens,
        totalClicks,
        totalBounces,
        uniqueContacts: statsMap.size,
        emailsTracked: events.length,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
