export const siteConfig = {
  name: "Brew City F.O.O.L.S.",
  shortName: "Brew City FOOLS",
  region: "Milwaukee & Southeastern Wisconsin",
  established: 2009,
  motto: "Duty. Pride. Tradition.",
  navigation: [
    { label: "About", href: "/#about" },
    { label: "Training", href: "/#training" },
    { label: "Events", href: "/events" },
    { label: "Join", href: "/join" },
    { label: "Contact", href: "/contact" },
  ],
  links: {
    applicationRoute: "/join",
    application: "https://www.jotform.com/form/211474845726058",
    renewal: "https://brewcityfools.com/shop/membership-renewal/",
    newMembership: "https://brewcityfools.com/shop/new-membership/",
    contact: "/contact",
    platoon: "https://platoonapp.com",
    facebook: "https://www.facebook.com/brewcity.fools",
    instagram: "https://www.instagram.com/brewcityfools/",
  },
  membership: {
    newMemberPrice: 50,
    renewalPrice: 35,
    paymentMode: "one-time",
    reviewRoles: ["Membership Trustee", "President"],
  },
  leadership: [
    {
      name: "Patrick Gaines",
      role: "President",
      image: "/images/leadership/patrick-gaines.jpg",
      email: "brewcitypresident@gmail.com",
    },
    {
      name: "Devin Shade",
      role: "Vice President",
      image: "/images/leadership/devin-shade.jpg",
      email: "brewcityvp@gmail.com",
    },
    {
      name: "Chad Halbach",
      role: "Membership Trustee",
      image: "/images/leadership/chad-halbach.jpg",
      email: "brewcitymembership@gmail.com",
    },
    {
      name: "Justin Mcmenamin",
      role: "Training Trustee",
      image: "/images/leadership/justin-mcmenamin.jpg",
      email: "brewcityfools@yahoo.com",
    },
    {
      name: "Justin Young",
      role: "Quartermaster",
      image: "/images/leadership/justin-young.jpg",
    },
    {
      name: "Tony Bilderback",
      role: "Membership",
      email: "brewcitymembership@gmail.com",
    },
  ],
  contactDirectory: [
    {
      role: "President",
      email: "brewcitypresident@gmail.com",
      description: "Chapter leadership and general chapter business",
    },
    {
      role: "Vice President",
      email: "brewcityvp@gmail.com",
      description: "Chapter support and officer coordination",
    },
    {
      role: "Secretary",
      email: "brewcitysecretary@gmail.com",
      description: "Records, correspondence, and chapter information",
    },
    {
      role: "Treasurer",
      email: "brewcitytreasurer@gmail.com",
      description: "Dues, payments, and financial questions",
    },
    {
      role: "Membership",
      email: "brewcitymembership@gmail.com",
      description: "Applications, renewals, and membership questions",
    },
    {
      role: "Training",
      email: "brewcityfools@yahoo.com",
      description: "Classes, instructors, and hosting training",
    },
    {
      role: "Social Media",
      email: "brewcitysocialmedia@gmail.com",
      description: "Photos, chapter updates, and social channels",
    },
  ],
} as const;
