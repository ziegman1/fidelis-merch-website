/**
 * Default storefront copy. Admin edits merge on top (see getSiteCopy).
 */

export type NavLinkDef = { href: string; label: string };

export type SiteCopy = {
  site: {
    name: string;
    tagline: string;
    description: string;
  };
  navLinks: NavLinkDef[];
  footer: { blurb: string };
  home: {
    whoTitle: string;
    whoBody: string;
    whoCta: string;
    whyTitle: string;
    whyBody: string;
    whyCta: string;
    merchTitle: string;
    merchBlurb: string;
    featuredTitle: string;
    featuredEmpty: string;
    viewAllMerchLabel: string;
  };
  homeHero: {
    headline: string;
    body: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
  };
  about: {
    title: string;
    lede: string;
    sections: { heading: string; body: string }[];
  };
  mission: {
    title: string;
    lede: string;
    focusHeading: string;
    bullets: string[];
    merchHeading: string;
    merchBody: string;
  };
  blog: {
    title: string;
    lede: string;
    intro: string;
    topicsHeading: string;
    topics: string[];
    emptyNote: string;
  };
  contact: {
    intro: string;
    responseExpectation: string;
    helpHeading: string;
    helpBullets: string[];
    beforeContactLead: string;
  };
  legalSupport: {
    supportEmail: string;
    supportResponseTime: string;
  };
};

export const DEFAULT_SITE_COPY: SiteCopy = {
  site: {
    name: "Zieg's on a Mission",
    tagline: "Ministry · Mission · Merch",
    description:
      "Zieg's on a Mission — mobilizing disciples, sharing the gospel, and offering merch that supports the work.",
  },
  navLinks: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/mission", label: "Mission" },
    { href: "/blog", label: "Blog" },
    { href: "/merch", label: "Merch" },
    { href: "/contact", label: "Contact" },
  ],
  footer: {
    blurb:
      "A ministry website with a merch store—gospel advance, partnership, and resources in one place.",
  },
  home: {
    whoTitle: "Who we are",
    whoBody:
      "Get to know the story behind the ministry—our family, our calling, and how this site serves partners and friends.",
    whoCta: "About us →",
    whyTitle: "Why we exist",
    whyBody:
      "Training, coaching, and gospel partnership—plus merch that helps fund day-to-day ministry needs.",
    whyCta: "Read our mission →",
    merchTitle: "Merch collections",
    merchBlurb:
      "Apparel and more—every purchase supports the work. Browse by category or see featured picks below.",
    featuredTitle: "Featured merch",
    featuredEmpty: "No featured products yet. Visit the shop when items are live.",
    viewAllMerchLabel: "View all merch",
  },
  homeHero: {
    headline: "Zieg's on a Mission",
    body: `We exist to mobilize and equip ordinary people to make an extraordinary impact for God's Kingdom. Serving with Team Expansion, our vision is to see disciples multiplied and churches planted among the unreached. Through mobilization, training, and coaching, we help raise up new workers who will carry the Gospel to the ends of the earth.`,
    primaryCtaLabel: "Partner with us",
    secondaryCtaLabel: "Shop merch",
  },
  about: {
    title: "About us",
    lede: `We're Jeremy and family—ordinary people who believe God calls every follower of Jesus into mission, whether across the street or around the world.`,
    sections: [
      {
        heading: "Who we are",
        body: `We serve with Team Expansion and care deeply about disciples being made and churches being planted where Christ is least known. Zieg's on a Mission is our public home for that story: updates for friends, partners, and anyone curious about what God is doing through ordinary people.`,
      },
      {
        heading: "Why this site",
        body: `You'll find our heart for the mission, a simple way to shop merch that helps fund day-to-day needs, and room to grow—blog posts, resources, and news as the Lord leads. Thank you for stopping by and for your prayers.`,
      },
    ],
  },
  mission: {
    title: "Our mission",
    lede: `We exist to mobilize and equip people for God's Kingdom—especially among the unreached. Through partnership, training, and coaching, we want to see more workers sent, sustained, and fruitful.`,
    focusHeading: "What we're focused on",
    bullets: [
      "Mobilizing and equipping believers to make disciples",
      "Encouraging churches and teams toward the unreached",
      "Inviting partners into prayer, giving, and practical support",
    ],
    merchHeading: "Merch with a purpose",
    merchBody: `The store on this site helps cover ministry costs and special projects. When you wear or gift something from the shop, you're also fueling gospel advance—thank you.`,
  },
  blog: {
    title: "Blog",
    lede: `Stories, updates, and resources from the field and from home—so you can pray specifically and celebrate what God is doing.`,
    intro: `We're building this space for honest updates: not polished perfection, but real life on mission. New posts will show up here as we publish them.`,
    topicsHeading: "What you'll find here",
    topics: [
      "Prayer requests and praise reports",
      "Short reflections on ministry and faith",
      "Resources we love for mission-minded friends",
    ],
    emptyNote: `No posts yet—check back soon, or say hello on the contact page if you'd like to connect.`,
  },
  contact: {
    intro: `We're here to help. For questions about your order, shipping, or returns, please reach out using the information below.`,
    responseExpectation: `We aim to respond within 1–2 business days. Please include your order number when contacting us about a specific order.`,
    helpHeading: "How We Can Help",
    helpBullets: [
      "Order status and tracking",
      "Shipping questions or delays",
      "Damaged or defective items",
      "Return and refund requests",
      "General product questions",
    ],
    beforeContactLead: "For faster answers, please review our",
  },
  legalSupport: {
    supportEmail: "orders@ziegsonamission.com",
    supportResponseTime: "within 1–2 business days",
  },
};
