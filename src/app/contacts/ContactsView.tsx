"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatDate, statusColor } from "@/lib/format";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  sector: string | null;
  location: string | null;
  status: "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
  companyId: string | null;
  createdAt: string | Date;
  company: { id: string; name: string } | null;
};

type CompanyOption = { id: string; name: string };

type ImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  sector?: string;
  location?: string;
  companyName?: string;
};

function parseCSVLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseSpreadsheet(text: string): { rows: ImportRow[]; detected: string[]; preview: string[][] } {
  // Strip BOM and normalise line endings
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], detected: [], preview: [] };

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const rawHeaders = parseCSVLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/\s+/g, "").replace(/"/g, "")
  );

  // Check if there's a combined full name column
  const fullNameIdx = rawHeaders.findIndex((h) =>
    h === "fullname" || h === "name" || h === "fullname" || h === "contactname"
  );

  // Map each column header to a field
  const mapping: (keyof ImportRow | null)[] = rawHeaders.map((h) => {
    if (["firstname", "first"].some((k) => h.includes(k))) return "firstName";
    if (["lastname", "surname", "last"].some((k) => h.includes(k))) return "lastName";
    if (h === "fullname" || h === "name" || h === "contactname") return null; // handled separately
    if (h.includes("email")) return "email";
    if (["phone", "mobile", "tel"].some((k) => h.includes(k))) return "phone";
    if (["jobtitle", "title", "position", "role"].some((k) => h.includes(k))) return "title";
    if (["sector", "industry"].some((k) => h.includes(k))) return "sector";
    if (["location", "city", "town", "address"].some((k) => h.includes(k))) return "location";
    if (["organisation", "organization", "company"].some((k) => h.includes(k))) return "companyName";
    return null;
  });

  const detected = [
    ...(fullNameIdx !== -1 ? ["name → First Name + Last Name"] : []),
    ...mapping
      .map((f, i) => (f ? `${rawHeaders[i]} → ${f}` : null))
      .filter(Boolean) as string[],
  ];

  const dataLines = lines.slice(1);
  const preview = dataLines.slice(0, 3).map((l) => parseCSVLine(l, delimiter));

  const rows: ImportRow[] = [];
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cells = parseCSVLine(line, delimiter);
    const row: Partial<ImportRow> = {};

    // Handle combined full name column
    if (fullNameIdx !== -1 && cells[fullNameIdx]) {
      const parts = cells[fullNameIdx].trim().split(/\s+/);
      row.firstName = parts[0] ?? "";
      row.lastName = parts.slice(1).join(" ") || parts[0]; // fallback to first if no last
    }

    mapping.forEach((field, i) => {
      if (field) (row as any)[field] = cells[i] ?? "";
    });
    if (row.email && row.firstName && row.lastName) {
      rows.push(row as ImportRow);
    }
  }

  return { rows, detected, preview };
}

type FormState = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  sector: string;
  location: string;
  status: Contact["status"];
  companyName: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  sector: "",
  location: "",
  status: "LEAD",
  companyName: "",
};

const STATUSES: Contact["status"][] = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"];

export default function ContactsView({
  initialContacts,
  companies,
}: {
  initialContacts: Contact[];
  companies: CompanyOption[];
}) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [localCompanies, setLocalCompanies] = useState<CompanyOption[]>(companies);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailContact, setEmailContact] = useState<Contact | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkIsHtml, setBulkIsHtml] = useState(false);
  const [bulkPreview, setBulkPreview] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number } | null>(null);

  // CSV import state
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importDetected, setImportDetected] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const [importFilename, setImportFilename] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        c.firstName,
        c.lastName,
        c.email,
        c.title ?? "",
        c.sector ?? "",
        c.location ?? "",
        c.company?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [contacts, search, statusFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Contact) {
    setForm({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone ?? "",
      title: c.title ?? "",
      sector: c.sector ?? "",
      location: c.location ?? "",
      status: c.status,
      companyName: c.company?.name ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Resolve company name → ID (create the company if it doesn't exist yet)
      let resolvedCompanyId: string | null = null;
      const typedName = form.companyName.trim();
      if (typedName) {
        const match = localCompanies.find(
          (c) => c.name.toLowerCase() === typedName.toLowerCase()
        );
        if (match) {
          resolvedCompanyId = match.id;
        } else {
          // Create the new company on the fly
          const coRes = await fetch("/api/companies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: typedName,
              industry: form.sector || "",
            }),
          });
          if (coRes.ok) {
            const newCo = await coRes.json();
            resolvedCompanyId = newCo.id;
            setLocalCompanies((prev) => [
              ...prev,
              { id: newCo.id, name: newCo.name },
            ]);
          }
        }
      }

      const url = form.id ? `/api/contacts/${form.id}` : "/api/contacts";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          title: form.title,
          sector: form.sector || null,
          location: form.location || null,
          status: form.status,
          companyId: resolvedCompanyId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved: Contact = await res.json();
      setContacts((prev) => {
        if (form.id) {
          return prev.map((c) => (c.id === saved.id ? saved : c));
        }
        return [saved, ...prev];
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function openEmail(c: Contact) {
    setEmailContact(c);
    setEmailSubject("");
    setEmailBody("");
    setEmailError(null);
    setEmailSuccess(false);
    setEmailOpen(true);
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailContact) return;
    setEmailSending(true);
    setEmailError(null);
    setEmailSuccess(false);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailContact.email,
          toName: `${emailContact.firstName} ${emailContact.lastName}`,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to send email");
      }
      setEmailSuccess(true);
    } catch (err: any) {
      setEmailError(err.message ?? "Something went wrong");
    } finally {
      setEmailSending(false);
    }
  }

  function openBulk() {
    setBulkSubject("");
    setBulkBody("");
    setBulkIsHtml(false);
    setBulkPreview(false);
    setBulkError(null);
    setBulkResult(null);
    setBulkOpen(true);
  }

  async function sendBulk(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`Send to ${filtered.length} contacts?`)) return;
    setBulkSending(true);
    setBulkError(null);
    setBulkResult(null);
    try {
      const res = await fetch("/api/email/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: filtered.map((c) => ({
            email: c.email,
            firstName: c.firstName,
            lastName: c.lastName,
          })),
          subject: bulkSubject,
          body: bulkBody,
          isHtml: bulkIsHtml,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to send");
      }
      const data = await res.json();
      setBulkResult(data);
    } catch (err: any) {
      setBulkError(err.message ?? "Something went wrong");
    } finally {
      setBulkSending(false);
    }
  }

  function openImport() {
    setImportRows([]);
    setImportDetected([]);
    setImportPreview([]);
    setImportFilename("");
    setImportResult(null);
    setImportError(null);
    setImportOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFilename(file.name);
    setImportResult(null);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, detected, preview } = parseSpreadsheet(text);
      setImportRows(rows);
      setImportDetected(detected);
      setImportPreview(preview);
      if (rows.length === 0) {
        setImportError("No valid contacts found. Make sure the file has First Name, Last Name, and Email columns.");
      }
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: importRows }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? "Import failed");
      }
      const result = await res.json();
      setImportResult(result);
      router.refresh();
    } catch (err: any) {
      setImportError(err.message ?? "Something went wrong");
    } finally {
      setImporting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert("Failed to delete contact");
    }
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} contacts in your database`}
        actions={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={openBulk}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Bulk Email ({filtered.length})
            </button>
            <button className="btn-secondary" onClick={openImport}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Import CSV
            </button>
            <button className="btn-primary" onClick={openCreate}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New Contact
            </button>
          </div>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <input
            className="input max-w-xs"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Title</th>
                <th className="table-th">Sector</th>
                <th className="table-th">Company</th>
                <th className="table-th">Location</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Email</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="table-td">{c.title ?? "—"}</td>
                  <td className="table-td">{c.sector ?? "—"}</td>
                  <td className="table-td">{c.company?.name ?? "—"}</td>
                  <td className="table-td">{c.location ?? "—"}</td>
                  <td className="table-td">{c.phone ?? "—"}</td>
                  <td className="table-td">
                    <a
                      href={`mailto:${c.email}`}
                      className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      {c.email}
                    </a>
                  </td>
                  <td className="table-td">
                    <span className={`pill ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-td text-right whitespace-nowrap">
                    <button
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 mr-3"
                      onClick={() => openEmail(c)}
                    >
                      Email
                    </button>
                    <button
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mr-3"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                      onClick={() => remove(c.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No contacts match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={`Bulk Email — ${filtered.length} contacts`}>
        {bulkResult ? (
          <div className="py-6 text-center space-y-3">
            <div className="text-green-600 dark:text-green-400 font-medium text-lg">Done!</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {bulkResult.sent} sent · {bulkResult.failed} failed
            </p>
            <button className="btn-primary mt-2" onClick={() => setBulkOpen(false)}>Close</button>
          </div>
        ) : (
          <form onSubmit={sendBulk} className="space-y-4">
            <div>
              <label className="label">Sending to</label>
              <input
                className="input bg-slate-50 dark:bg-slate-800"
                value={`${filtered.length} contacts (use search/filter to narrow down)`}
                disabled
              />
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                required
                placeholder="e.g. Important update from Brown Consult"
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Message</label>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={bulkIsHtml} onChange={(e) => setBulkIsHtml(e.target.checked)} />
                    HTML mode
                  </label>
                  {bulkIsHtml && (
                    <button type="button" className="text-brand-600 hover:underline" onClick={() => setBulkPreview(!bulkPreview)}>
                      {bulkPreview ? "Edit" : "Preview"}
                    </button>
                  )}
                </div>
              </div>
              {bulkIsHtml && bulkPreview ? (
                <div
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 min-h-[160px] text-sm overflow-auto bg-white dark:bg-slate-900"
                  dangerouslySetInnerHTML={{ __html: bulkBody }}
                />
              ) : (
                <textarea
                  className="input min-h-[160px] resize-y font-mono text-sm"
                  required
                  placeholder={bulkIsHtml
                    ? "<p>Dear {{firstName}},</p>\n<p>Your message here...</p>"
                    : "Write your message here...\n\nTip: use {{firstName}} to personalise each email."}
                  value={bulkBody}
                  onChange={(e) => setBulkBody(e.target.value)}
                />
              )}
              <p className="text-xs text-slate-400 mt-1">Use <code>{"{{firstName}}"}</code> to personalise each email with the recipient's first name.</p>
            </div>
            {bulkError && (
              <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
                {bulkError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setBulkOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={bulkSending}>
                {bulkSending ? "Sending..." : `Send to ${filtered.length} contacts`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title={`Email ${emailContact?.firstName} ${emailContact?.lastName}`}
      >
        {emailSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="text-green-600 dark:text-green-400 font-medium text-lg">Email sent!</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your email was sent to {emailContact?.email}
            </p>
            <button className="btn-primary mt-2" onClick={() => setEmailOpen(false)}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={sendEmail} className="space-y-4">
            <div>
              <label className="label">To</label>
              <input
                className="input bg-slate-50 dark:bg-slate-800"
                value={`${emailContact?.firstName} ${emailContact?.lastName} <${emailContact?.email}>`}
                disabled
              />
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                required
                placeholder="e.g. Exciting news from Brown Consult"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input min-h-[160px] resize-y"
                required
                placeholder="Write your message here..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
            {emailError && (
              <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
                {emailError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEmailOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={emailSending}>
                {emailSending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── CSV IMPORT MODAL ── */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Contacts from CSV">
        {importResult ? (
          <div className="py-6 text-center space-y-3">
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg">
              Import complete!
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{importResult.imported} contacts added</span>
              {importResult.skipped > 0 && (
                <span className="ml-1 text-slate-400">· {importResult.skipped} skipped (already exist or missing data)</span>
              )}
            </p>
            <button className="btn-primary mt-2" onClick={() => setImportOpen(false)}>Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upload a <strong>.csv</strong> or <strong>.txt</strong> (tab-separated) file. Required columns:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">First Name, Last Name, Email</span>.
              Optional: Organisation, Job Title, Phone, Sector, Location.
              Existing contacts will <strong>not</strong> be overwritten.
            </p>

            {/* File picker */}
            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 cursor-pointer hover:border-brand-400 transition-colors">
              <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {importFilename || "Click to choose a file"}
              </span>
              <span className="text-xs text-slate-400">.csv or tab-separated .txt</span>
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            {/* Detection results */}
            {importRows.length > 0 && (
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    ✓ {importRows.length} contacts ready to import
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {importDetected.map((d) => (
                    <span key={d} className="rounded-full bg-brand-100 dark:bg-brand-500/20 px-2 py-0.5 text-xs text-brand-700 dark:text-brand-300">
                      {d}
                    </span>
                  ))}
                </div>
                {/* Preview rows */}
                {importPreview.length > 0 && (
                  <div className="mt-2 overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full text-xs">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.map((row, i) => (
                          <tr key={i} className="odd:bg-white dark:odd:bg-slate-900 even:bg-slate-50 dark:even:bg-slate-800/40">
                            {row.slice(0, 5).map((cell, j) => (
                              <td key={j} className="px-2 py-1 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                                {cell || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {importError && (
              <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
                {importError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" className="btn-secondary" onClick={() => setImportOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={importRows.length === 0 || importing}
                onClick={doImport}
              >
                {importing ? "Importing…" : `Import ${importRows.length} contacts`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit Contact" : "New Contact"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                required
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sector</label>
              <input
                className="input"
                placeholder="e.g. Education, Charity"
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                placeholder="e.g. London, Manchester"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as Contact["status"],
                  })
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <input
                className="input"
                list="company-suggestions"
                placeholder="Type to search or add new…"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value })
                }
              />
              <datalist id="company-suggestions">
                {localCompanies.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-slate-400">
                Pick an existing company or type a new name — it will be created automatically.
              </p>
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : form.id ? "Save changes" : "Create contact"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
