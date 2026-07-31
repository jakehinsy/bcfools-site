export const siteConfig = {
  name: "Brew City F.O.O.L.S.",
  shortName: "Brew City FOOLS",
  region: "Milwaukee & Southeastern Wisconsin",
  established: 2009,
  motto: "Duty. Pride. Tradition.",
  navigation: [
    { label: "About", href: "/#about" },
    { label: "Training", href: "/#training" },
    { label: "Events", href: "/#events" },
    { label: "Join", href: "/join" },
    { label: "Contact", href: "/#contact" },
  ],
  links: {
    applicationRoute: "/join",
    application: "https://www.jotform.com/form/211474845726058",
    renewal: "https://brewcityfools.com/shop/membership-renewal/",
    newMembership: "https://brewcityfools.com/shop/new-membership/",
    contact: "https://brewcityfools.com/contact/",
    facebook: "https://www.facebook.com/brewcity.fools",
    instagram: "https://www.instagram.com/brewcityfools/",
  },
  membership: {
    newMemberPrice: 50,
    renewalPrice: 35,
    paymentMode: "one-time",
    reviewRoles: ["Membership Trustee", "President"],
  },
} as const;
