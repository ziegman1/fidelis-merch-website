import { cache } from "react";
import { DEFAULT_SITE_COPY, type NavLinkDef, type SiteCopy } from "@/data/site-copy-defaults";
import { LEGAL_CONFIG } from "@/data/legal-config";
import { prisma } from "@/lib/db";

const SITE_COPY_ID = "default";

function mergeNavLinks(saved: unknown): NavLinkDef[] {
  const d = DEFAULT_SITE_COPY.navLinks;
  if (!Array.isArray(saved) || saved.length !== d.length) return d;
  return d.map((link, i) => {
    const row = saved[i] as { href?: string; label?: string } | undefined;
    const label = typeof row?.label === "string" && row.label.trim() ? row.label.trim() : link.label;
    return { href: link.href, label };
  });
}

function mergeAboutSections(
  saved: unknown,
  fallback: SiteCopy["about"]["sections"],
): SiteCopy["about"]["sections"] {
  if (!Array.isArray(saved) || saved.length === 0) return fallback;
  return saved.map((item, i) => {
    const s = item as { heading?: string; body?: string };
    const fb = fallback[i];
    return {
      heading: typeof s?.heading === "string" ? s.heading : fb?.heading ?? `Section ${i + 1}`,
      body: typeof s?.body === "string" ? s.body : fb?.body ?? "",
    };
  });
}

function mergeStringArray(saved: unknown, fallback: string[]): string[] {
  if (!Array.isArray(saved)) return fallback;
  const next = saved.filter((x): x is string => typeof x === "string");
  return next.length > 0 ? next : fallback;
}

export function mergeSiteCopyPayload(dbPayload: unknown): SiteCopy {
  const p = dbPayload && typeof dbPayload === "object" && !Array.isArray(dbPayload) ? dbPayload : {};
  const patch = p as Partial<SiteCopy>;
  const d = DEFAULT_SITE_COPY;

  return {
    site: { ...d.site, ...patch.site },
    navLinks: mergeNavLinks(patch.navLinks),
    footer: { ...d.footer, ...patch.footer },
    home: { ...d.home, ...patch.home },
    homeHero: { ...d.homeHero, ...patch.homeHero },
    about: {
      ...d.about,
      ...patch.about,
      sections: mergeAboutSections(patch.about?.sections, d.about.sections),
    },
    mission: {
      ...d.mission,
      ...patch.mission,
      bullets: mergeStringArray(patch.mission?.bullets, d.mission.bullets),
    },
    blog: {
      ...d.blog,
      ...patch.blog,
      topics: mergeStringArray(patch.blog?.topics, d.blog.topics),
    },
    contact: { ...d.contact, ...patch.contact },
    legalSupport: { ...d.legalSupport, ...patch.legalSupport },
  };
}

export const getSiteCopy = cache(async (): Promise<SiteCopy> => {
  try {
    const row = await prisma.siteCopy.findUnique({ where: { id: SITE_COPY_ID } });
    return mergeSiteCopyPayload(row?.payload ?? {});
  } catch {
    return structuredClone(DEFAULT_SITE_COPY);
  }
});

/** Legal templates + emails: support fields can be overridden from SiteCopy admin. */
export async function getMergedLegalConfig() {
  const copy = await getSiteCopy();
  return {
    ...LEGAL_CONFIG,
    supportEmail: copy.legalSupport.supportEmail || LEGAL_CONFIG.supportEmail,
    supportResponseTime:
      copy.legalSupport.supportResponseTime || LEGAL_CONFIG.supportResponseTime,
  };
}

export function homeHeroWithHrefs(copy: SiteCopy) {
  return {
    headline: copy.homeHero.headline,
    body: copy.homeHero.body,
    primaryCta: { href: "/mission" as const, label: copy.homeHero.primaryCtaLabel },
    secondaryCta: { href: "/merch" as const, label: copy.homeHero.secondaryCtaLabel },
  };
}
