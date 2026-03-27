/**
 * Legal and compliance configuration.
 * Edit these values for your business before launch.
 */

export const LEGAL_CONFIG = {
  /** Support / contact email */
  supportEmail: "orders@ziegsonamission.com",

  /** Resend "from" header — must match a verified domain in Resend */
  orderEmailFrom:
    "Zieg's on a Mission <orders@ziegsonamission.com>",

  /** Privacy Policy effective date (YYYY-MM-DD) */
  privacyEffectiveDate: "2026-03-09",

  /** Terms of Service effective date (YYYY-MM-DD) */
  termsEffectiveDate: "2026-03-09",

  /** Days after delivery within which damaged/defective items must be reported */
  damagedItemReportingWindowDays: 14,

  /**
   * Governing law and venue placeholder.
   * TODO: Review with legal counsel and replace with your state/jurisdiction.
   */
  governingLawPlaceholder: "[State of [YOUR STATE], United States]",

  /**
   * Support response time expectation.
   * TODO: Set based on your actual support capacity.
   */
  supportResponseTime: "within 1–2 business days",

  /** Site URL for links in emails */
  siteUrl: "https://ziegsonamission.com",
} as const;

/**
 * TODO: If you add analytics (e.g., Google Analytics, Plausible) or marketing cookies,
 * implement a cookie consent banner and update the Privacy Policy accordingly.
 * Currently the site uses only essential session/cart cookies.
 */
