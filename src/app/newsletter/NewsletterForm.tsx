"use client";

import { useState } from "react";

const SECTORS = ["all", "Education", "Police", "Fire", "Health", "Charity"];

const SERVICES = [
  "Fractional Estates Director",
  "Capital Project Management",
  "Site Inspections",
  "Estates Strategy",
  "FM Team Structure",
  "H&S & Compliance",
  "Procurement",
  "Access Audits",
];

const EMPTY_NEWS = { headline: "", summary: "", readMoreUrl: "", source: "" };

export default function NewsletterForm() {
  const [subject, setSubject] = useState("");
  const [intro, setIntro] = useState("");
  const [newsItems, setNewsItems] = useState([{ ...EMPTY_NEWS }, { ...EMPTY_NEWS }]);
  const [service, setService] = useState(SERVICES[0]);
  const [spotlightCopy, setSpotlightCopy] = useState("");
  const [ctaText, setCtaText] = useState("Discuss Your Needs");
  const [ctaUrl, setCtaUrl] = useState("https://www.brownconsult.co.uk/service-page/introductory-consultation");
  const [sector, setSector] = useState("Education");
  const [brand, setBrand] = useState<"brownconsult" | "helpforschools">("helpforschools");
  const [batchOffset, setBatchOffset] = useState(0);
  const [batchLimit, setBatchLimit] = useState<number | "">(300);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  function updateNews(i: number, field: string, value: string) {
    setNewsItems((prev) => prev.map((n, idx) => idx === i ? { ...n, [field]: value } : n));
    setPreviewed(false);
  }

  function addNewsItem() {
    setNewsItems((prev) => [...prev, { ...EMPTY_NEWS }]);
  }

  function removeNewsItem(i: number) {
    setNewsItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function buildPayload(previewOnly = false) {
    return {
      subject,
      intro,
      newsItems: newsItems.filter((n) => n.headline && n.summary),
      spotlight: { service, copy: spotlightCopy, ctaText, ctaUrl },
      sector,
      brand,
      batchOffset,
      batchLimit: batchLimit === "" ? undefined : batchLimit,
      previewOnly,
    };
  }

  async function preview() {
    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(true)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewHtml(data.html);
      setPreviewed(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function send() {
    if (!confirm(`Send newsletter to ${sector === "all" ? "all contacts" : sector + " contacts"}?`)) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(false)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-2xl">Newsletter Sent!</div>
        <p className="text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-emerald-600">{result.sent} emails sent</span>
          {result.failed > 0 && <span className="text-rose-500 ml-2">· {result.failed} failed</span>}
          <span className="text-slate-400 ml-2">out of {result.total} contacts</span>
        </p>
        <button className="btn-primary mt-4" onClick={() => setResult(null)}>Send Another</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {previewHtml && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</h2>
            <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setPreviewHtml(null)}>Close preview</button>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900">
            <iframe
              srcDoc={previewHtml}
              className="w-full rounded border border-slate-200 dark:border-slate-700"
              style={{ height: "600px" }}
              title="Email preview"
            />
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Subject & Intro</h2>
        <div>
          <label className="label">Subject line</label>
          <input className="input" placeholder="e.g. Brown Consult | Week of June 9" value={subject} onChange={(e) => { setSubject(e.target.value); setPreviewed(false); }} />
        </div>
        <div>
          <label className="label">Intro paragraph</label>
          <textarea className="input min-h-[80px] resize-y" placeholder="Opening line of the newsletter..." value={intro} onChange={(e) => { setIntro(e.target.value); setPreviewed(false); }} />
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">In the Sector — News Items</h2>
          <button className="text-xs text-brand-600 hover:underline" onClick={addNewsItem}>+ Add item</button>
        </div>
        {newsItems.map((item, i) => (
          <div key={i} className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Item {i + 1}</span>
              {newsItems.length > 1 && (
                <button className="text-xs text-rose-500 hover:underline" onClick={() => removeNewsItem(i)}>Remove</button>
              )}
            </div>
            <input className="input" placeholder="Headline" value={item.headline} onChange={(e) => updateNews(i, "headline", e.target.value)} />
            <textarea className="input min-h-[80px] resize-y" placeholder="Summary paragraph" value={item.summary} onChange={(e) => updateNews(i, "summary", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Source (e.g. GOV.UK)" value={item.source} onChange={(e) => updateNews(i, "source", e.target.value)} />
              <input className="input" placeholder="Read more URL" value={item.readMoreUrl} onChange={(e) => updateNews(i, "readMoreUrl", e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">From Brown Consult — Service Spotlight</h2>
        <div>
          <label className="label">Service</label>
          <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Copy</label>
          <textarea className="input min-h-[120px] resize-y" placeholder="Service description..." value={spotlightCopy} onChange={(e) => setSpotlightCopy(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">CTA button text</label>
            <input className="input" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          </div>
          <div>
            <label className="label">CTA URL</label>
            <input className="input" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recipients</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Sector</label>
            <select className="input" value={sector} onChange={(e) => {
              const s = e.target.value;
              setSector(s);
              setBrand(s === "Education" ? "helpforschools" : "brownconsult");
              setPreviewed(false);
            }}>
              {SECTORS.map((s) => <option key={s} value={s}>{s === "all" ? "All sectors" : s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Batch limit</label>
            <input className="input" type="number" placeholder="All" value={batchLimit} onChange={(e) => setBatchLimit(e.target.value === "" ? "" : parseInt(e.target.value))} />
          </div>
          <div>
            <label className="label">Batch offset</label>
            <input className="input" type="number" value={batchOffset} onChange={(e) => setBatchOffset(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Sending as:</span>
          <button type="button"
            className={`text-xs px-3 py-1 rounded-full font-medium border transition ${brand === "helpforschools" ? "bg-[#022179] text-white border-[#022179]" : "bg-white text-slate-500 border-slate-200"}`}
            onClick={() => { setBrand("helpforschools"); setPreviewed(false); }}>
            Help for Schools
          </button>
          <button type="button"
            className={`text-xs px-3 py-1 rounded-full font-medium border transition ${brand === "brownconsult" ? "bg-[#8B6B18] text-white border-[#8B6B18]" : "bg-white text-slate-500 border-slate-200"}`}
            onClick={() => { setBrand("brownconsult"); setPreviewed(false); }}>
            Brown Consult
          </button>
        </div>
        <p className="text-xs text-slate-400">Leave limit blank to send to all. Use offset 0 for Monday batch, 300 for Tuesday batch.</p>
      </div>

      {error && (
        <div className="text-sm text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/30 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-secondary" onClick={preview} disabled={previewing || !subject || !intro}>
          {previewing ? "Generating…" : "Preview Email"}
        </button>
        <div className="flex flex-col">
          <button
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={send}
            disabled={sending || !previewed || !subject || !intro || newsItems.every((n) => !n.headline)}
          >
            {sending ? "Sending…" : "Send Newsletter"}
          </button>
          {!previewed && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Preview required before sending</p>
          )}
        </div>
      </div>
    </div>
  );
}
