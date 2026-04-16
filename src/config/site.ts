export const siteConfig = {
  name: "Torix Network",
  title: "Torix Network | Digital Infrastructure Studio",
  description:
    "Torix Network builds Telegram bots, websites, web apps, API integrations, automation systems, cloud infrastructure, and launch support for modern digital teams.",
  url: "https://torixnetwork.com",
  email: "torixnetwork@gmail.com",
  telegramUrl: "https://t.me/TorixNetwork",
  telegramHandle: "@TorixNetwork",
  ogImage: "/og-image.png",
  themeColor: "#03050b",
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT || ""
};

export const navItems = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Why Torix", href: "#why" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" }
];
