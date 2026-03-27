import { z } from "zod";
import { DEFAULT_SITE_COPY } from "@/data/site-copy-defaults";

const navLen = DEFAULT_SITE_COPY.navLinks.length;

const navLinkSchema = z.object({
  href: z.string(),
  label: z.string().min(1).max(80),
});

const sectionSchema = z.object({
  heading: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
});

export const siteCopySaveSchema = z.object({
  site: z.object({
    name: z.string().min(1).max(200),
    tagline: z.string().max(200),
    description: z.string().min(1).max(2000),
  }),
  navLinks: z.array(navLinkSchema).length(navLen),
  footer: z.object({
    blurb: z.string().min(1).max(2000),
  }),
  home: z.object({
    whoTitle: z.string().min(1).max(200),
    whoBody: z.string().min(1).max(4000),
    whoCta: z.string().min(1).max(120),
    whyTitle: z.string().min(1).max(200),
    whyBody: z.string().min(1).max(4000),
    whyCta: z.string().min(1).max(120),
    merchTitle: z.string().min(1).max(200),
    merchBlurb: z.string().min(1).max(2000),
    featuredTitle: z.string().min(1).max(200),
    featuredEmpty: z.string().min(1).max(500),
    viewAllMerchLabel: z.string().min(1).max(120),
  }),
  homeHero: z.object({
    headline: z.string().min(1).max(300),
    body: z.string().min(1).max(20000),
    primaryCtaLabel: z.string().min(1).max(120),
    secondaryCtaLabel: z.string().min(1).max(120),
  }),
  about: z.object({
    title: z.string().min(1).max(200),
    lede: z.string().min(1).max(4000),
    sections: z.array(sectionSchema).min(1).max(12),
  }),
  mission: z.object({
    title: z.string().min(1).max(200),
    lede: z.string().min(1).max(4000),
    focusHeading: z.string().min(1).max(200),
    bullets: z.array(z.string().min(1).max(500)).min(1).max(20),
    merchHeading: z.string().min(1).max(200),
    merchBody: z.string().min(1).max(4000),
  }),
  blog: z.object({
    title: z.string().min(1).max(200),
    lede: z.string().min(1).max(2000),
    intro: z.string().min(1).max(4000),
    topicsHeading: z.string().min(1).max(200),
    topics: z.array(z.string().min(1).max(500)).min(1).max(20),
    emptyNote: z.string().min(1).max(2000),
  }),
  contact: z.object({
    intro: z.string().min(1).max(4000),
    responseExpectation: z.string().min(1).max(1000),
    helpHeading: z.string().min(1).max(200),
    helpBullets: z.array(z.string().min(1).max(300)).min(1).max(30),
    beforeContactLead: z.string().min(1).max(500),
  }),
  legalSupport: z.object({
    supportEmail: z.string().min(3).max(200),
    supportResponseTime: z.string().min(1).max(200),
  }),
})
  .superRefine((val, ctx) => {
    val.navLinks.forEach((link, i) => {
      const expected = DEFAULT_SITE_COPY.navLinks[i]?.href;
      if (expected && link.href !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Nav href must remain ${expected}`,
          path: ["navLinks", i, "href"],
        });
      }
    });
  });

export type SiteCopySaveInput = z.infer<typeof siteCopySaveSchema>;
