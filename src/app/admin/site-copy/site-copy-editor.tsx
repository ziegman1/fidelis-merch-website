"use client";

import { useState } from "react";
import type { SiteCopy } from "@/data/site-copy-defaults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resetSiteCopyToDefaultsAction, saveSiteCopyAction } from "./actions";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-zinc-300">{label}</Label>
      {children}
    </div>
  );
}

export function SiteCopyEditor({ initialCopy }: { initialCopy: SiteCopy }) {
  const [copy, setCopy] = useState<SiteCopy>(() =>
    structuredClone(JSON.parse(JSON.stringify(initialCopy)) as SiteCopy),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    const res = await saveSiteCopyAction(copy);
    if (!res.ok) {
      setStatus("error");
      setErrorMsg(res.error + (res.details ? ` — ${JSON.stringify(res.details)}` : ""));
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  }

  async function handleResetLocal() {
    const res = await resetSiteCopyToDefaultsAction();
    if (res.ok) setCopy(res.data);
    else setErrorMsg(res.error);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <p className="text-sm text-zinc-400 max-w-xl">
          Changes apply to the public site after you save. Nav link URLs are fixed; only labels are
          editable.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleResetLocal}>
            Reset form to code defaults
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save all changes"}
          </Button>
        </div>
      </div>

      {status === "saved" && (
        <p className="text-sm text-emerald-400">Saved. Storefront pages were refreshed.</p>
      )}
      {errorMsg && <p className="text-sm text-red-400 whitespace-pre-wrap">{errorMsg}</p>}

      <details open className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Site & metadata</summary>
        <div className="mt-4 space-y-4">
          <Field label="Site name">
            <Input
              value={copy.site.name}
              onChange={(e) => setCopy((c) => ({ ...c, site: { ...c.site, name: e.target.value } }))}
            />
          </Field>
          <Field label="Tagline">
            <Input
              value={copy.site.tagline}
              onChange={(e) =>
                setCopy((c) => ({ ...c, site: { ...c.site, tagline: e.target.value } }))
              }
            />
          </Field>
          <Field label="Meta description">
            <Textarea
              rows={3}
              value={copy.site.description}
              onChange={(e) =>
                setCopy((c) => ({ ...c, site: { ...c.site, description: e.target.value } }))
              }
            />
          </Field>
        </div>
      </details>

      <details className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Navigation labels</summary>
        <div className="mt-4 space-y-3">
          {copy.navLinks.map((link, i) => (
            <div key={link.href} className="flex flex-col sm:flex-row sm:items-end gap-2">
              <Field label={`Label (${link.href})`}>
                <Input
                  value={link.label}
                  onChange={(e) =>
                    setCopy((c) => {
                      const navLinks = [...c.navLinks];
                      navLinks[i] = { ...navLinks[i]!, label: e.target.value };
                      return { ...c, navLinks };
                    })
                  }
                />
              </Field>
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Footer</summary>
        <div className="mt-4">
          <Field label="Footer blurb (under site name)">
            <Textarea
              rows={3}
              value={copy.footer.blurb}
              onChange={(e) =>
                setCopy((c) => ({ ...c, footer: { ...c.footer, blurb: e.target.value } }))
              }
            />
          </Field>
        </div>
      </details>

      <details open className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Home — hero</summary>
        <div className="mt-4 space-y-4">
          <Field label="Headline">
            <Input
              value={copy.homeHero.headline}
              onChange={(e) =>
                setCopy((c) => ({ ...c, homeHero: { ...c.homeHero, headline: e.target.value } }))
              }
            />
          </Field>
          <Field label="Body">
            <Textarea
              rows={6}
              value={copy.homeHero.body}
              onChange={(e) =>
                setCopy((c) => ({ ...c, homeHero: { ...c.homeHero, body: e.target.value } }))
              }
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Primary button (→ /mission)">
              <Input
                value={copy.homeHero.primaryCtaLabel}
                onChange={(e) =>
                  setCopy((c) => ({
                    ...c,
                    homeHero: { ...c.homeHero, primaryCtaLabel: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Secondary button (→ /merch)">
              <Input
                value={copy.homeHero.secondaryCtaLabel}
                onChange={(e) =>
                  setCopy((c) => ({
                    ...c,
                    homeHero: { ...c.homeHero, secondaryCtaLabel: e.target.value },
                  }))
                }
              />
            </Field>
          </div>
        </div>
      </details>

      <details className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Home — cards & merch blocks</summary>
        <div className="mt-4 space-y-6">
          <p className="text-xs text-zinc-500">“Who we are” / “Why we exist” cards</p>
          <div className="grid gap-4">
            <Field label="Who — title">
              <Input
                value={copy.home.whoTitle}
                onChange={(e) =>
                  setCopy((c) => ({ ...c, home: { ...c.home, whoTitle: e.target.value } }))
                }
              />
            </Field>
            <Field label="Who — body">
              <Textarea
                rows={3}
                value={copy.home.whoBody}
                onChange={(e) =>
                  setCopy((c) => ({ ...c, home: { ...c.home, whoBody: e.target.value } }))
                }
              />
            </Field>
            <Field label="Who — link text">
              <Input
                value={copy.home.whoCta}
                onChange={(e) =>
                  setCopy((c) => ({ ...c, home: { ...c.home, whoCta: e.target.value } }))
                }
              />
            </Field>
            <Field label="Why — title">
              <Input
                value={copy.home.whyTitle}
                onChange={(e) =>
                  setCopy((c) => ({ ...c, home: { ...c.home, whyTitle: e.target.value } }))
                }
              />
            </Field>
            <Field label="Why — body">
              <Textarea
                rows={3}
                value={copy.home.whyBody}
                onChange={(e) =>
                  setCopy((c) => ({ ...c, home: { ...c.home, whyBody: e.target.value } }))
                }
              />
            </Field>
            <Field label="Why — link text">
              <Input
                value={copy.home.whyCta}
                onChange={(e) =>
                  setCopy((c) => ({ ...c, home: { ...c.home, whyCta: e.target.value } }))
                }
              />
            </Field>
          </div>
          <Field label="Merch collections — title">
            <Input
              value={copy.home.merchTitle}
              onChange={(e) =>
                setCopy((c) => ({ ...c, home: { ...c.home, merchTitle: e.target.value } }))
              }
            />
          </Field>
          <Field label="Merch collections — blurb">
            <Textarea
              rows={2}
              value={copy.home.merchBlurb}
              onChange={(e) =>
                setCopy((c) => ({ ...c, home: { ...c.home, merchBlurb: e.target.value } }))
              }
            />
          </Field>
          <Field label="Featured merch — title">
            <Input
              value={copy.home.featuredTitle}
              onChange={(e) =>
                setCopy((c) => ({ ...c, home: { ...c.home, featuredTitle: e.target.value } }))
              }
            />
          </Field>
          <Field label="Featured — empty state message">
            <Input
              value={copy.home.featuredEmpty}
              onChange={(e) =>
                setCopy((c) => ({ ...c, home: { ...c.home, featuredEmpty: e.target.value } }))
              }
            />
          </Field>
          <Field label="View all merch — button label">
            <Input
              value={copy.home.viewAllMerchLabel}
              onChange={(e) =>
                setCopy((c) => ({ ...c, home: { ...c.home, viewAllMerchLabel: e.target.value } }))
              }
            />
          </Field>
        </div>
      </details>

      <details className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">About page</summary>
        <div className="mt-4 space-y-4">
          <Field label="Title">
            <Input
              value={copy.about.title}
              onChange={(e) =>
                setCopy((c) => ({ ...c, about: { ...c.about, title: e.target.value } }))
              }
            />
          </Field>
          <Field label="Intro (lede)">
            <Textarea
              rows={3}
              value={copy.about.lede}
              onChange={(e) =>
                setCopy((c) => ({ ...c, about: { ...c.about, lede: e.target.value } }))
              }
            />
          </Field>
          {copy.about.sections.map((sec, i) => (
            <div key={i} className="rounded-md border border-zinc-700 p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Section {i + 1}</span>
                {copy.about.sections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-400"
                    onClick={() =>
                      setCopy((c) => ({
                        ...c,
                        about: {
                          ...c.about,
                          sections: c.about.sections.filter((_, j) => j !== i),
                        },
                      }))
                    }
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Input
                placeholder="Heading"
                value={sec.heading}
                onChange={(e) =>
                  setCopy((c) => {
                    const sections = [...c.about.sections];
                    sections[i] = { ...sections[i]!, heading: e.target.value };
                    return { ...c, about: { ...c.about, sections } };
                  })
                }
              />
              <Textarea
                placeholder="Body"
                rows={4}
                value={sec.body}
                onChange={(e) =>
                  setCopy((c) => {
                    const sections = [...c.about.sections];
                    sections[i] = { ...sections[i]!, body: e.target.value };
                    return { ...c, about: { ...c.about, sections } };
                  })
                }
              />
            </div>
          ))}
          {copy.about.sections.length < 12 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCopy((c) => ({
                  ...c,
                  about: {
                    ...c.about,
                    sections: [...c.about.sections, { heading: "New section", body: "" }],
                  },
                }))
              }
            >
              Add section
            </Button>
          )}
        </div>
      </details>

      <details className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Mission page</summary>
        <div className="mt-4 space-y-4">
          <Field label="Title">
            <Input
              value={copy.mission.title}
              onChange={(e) =>
                setCopy((c) => ({ ...c, mission: { ...c.mission, title: e.target.value } }))
              }
            />
          </Field>
          <Field label="Lede">
            <Textarea
              rows={3}
              value={copy.mission.lede}
              onChange={(e) =>
                setCopy((c) => ({ ...c, mission: { ...c.mission, lede: e.target.value } }))
              }
            />
          </Field>
          <Field label="Focus list heading">
            <Input
              value={copy.mission.focusHeading}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  mission: { ...c.mission, focusHeading: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Bullets (one per line)">
            <Textarea
              rows={5}
              value={copy.mission.bullets.join("\n")}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  mission: {
                    ...c.mission,
                    bullets: e.target.value
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean),
                  },
                }))
              }
            />
          </Field>
          <Field label="Merch block heading">
            <Input
              value={copy.mission.merchHeading}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  mission: { ...c.mission, merchHeading: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Merch block body">
            <Textarea
              rows={4}
              value={copy.mission.merchBody}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  mission: { ...c.mission, merchBody: e.target.value },
                }))
              }
            />
          </Field>
        </div>
      </details>

      <details className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Blog page</summary>
        <div className="mt-4 space-y-4">
          <Field label="Title">
            <Input
              value={copy.blog.title}
              onChange={(e) =>
                setCopy((c) => ({ ...c, blog: { ...c.blog, title: e.target.value } }))
              }
            />
          </Field>
          <Field label="Lede">
            <Textarea
              rows={2}
              value={copy.blog.lede}
              onChange={(e) =>
                setCopy((c) => ({ ...c, blog: { ...c.blog, lede: e.target.value } }))
              }
            />
          </Field>
          <Field label="Intro">
            <Textarea
              rows={3}
              value={copy.blog.intro}
              onChange={(e) =>
                setCopy((c) => ({ ...c, blog: { ...c.blog, intro: e.target.value } }))
              }
            />
          </Field>
          <Field label="Topics heading">
            <Input
              value={copy.blog.topicsHeading}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  blog: { ...c.blog, topicsHeading: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Topics (one per line)">
            <Textarea
              rows={4}
              value={copy.blog.topics.join("\n")}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  blog: {
                    ...c.blog,
                    topics: e.target.value
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean),
                  },
                }))
              }
            />
          </Field>
          <Field label="Empty state note">
            <Textarea
              rows={2}
              value={copy.blog.emptyNote}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  blog: { ...c.blog, emptyNote: e.target.value },
                }))
              }
            />
          </Field>
        </div>
      </details>

      <details className="rounded-lg border border-brand-primary/30 bg-zinc-900/50 p-4">
        <summary className="cursor-pointer font-medium text-brand-primary">Contact & support (also used on legal pages for email)</summary>
        <div className="mt-4 space-y-4">
          <Field label="Support email (shown on Contact, Privacy, Terms, etc.)">
            <Input
              value={copy.legalSupport.supportEmail}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  legalSupport: { ...c.legalSupport, supportEmail: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Response time snippet (e.g. “within 1–2 business days”)">
            <Input
              value={copy.legalSupport.supportResponseTime}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  legalSupport: { ...c.legalSupport, supportResponseTime: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Contact — intro paragraph">
            <Textarea
              rows={3}
              value={copy.contact.intro}
              onChange={(e) =>
                setCopy((c) => ({ ...c, contact: { ...c.contact, intro: e.target.value } }))
              }
            />
          </Field>
          <Field label="Contact — expectations under email">
            <Textarea
              rows={2}
              value={copy.contact.responseExpectation}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  contact: { ...c.contact, responseExpectation: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="“How we can help” heading">
            <Input
              value={copy.contact.helpHeading}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  contact: { ...c.contact, helpHeading: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Help bullets (one per line)">
            <Textarea
              rows={5}
              value={copy.contact.helpBullets.join("\n")}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  contact: {
                    ...c.contact,
                    helpBullets: e.target.value
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean),
                  },
                }))
              }
            />
          </Field>
          <Field label="Before contact — lead-in (before Shipping / Returns links)">
            <Input
              value={copy.contact.beforeContactLead}
              onChange={(e) =>
                setCopy((c) => ({
                  ...c,
                  contact: { ...c.contact, beforeContactLead: e.target.value },
                }))
              }
            />
          </Field>
        </div>
      </details>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save all changes"}
        </Button>
      </div>
    </div>
  );
}
