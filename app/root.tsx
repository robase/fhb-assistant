import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import "./tailwind.css";
import { LinksFunction, MetaFunction } from "@vercel/remix";
import { Analytics } from "@vercel/analytics/react";

export const meta: MetaFunction = () => [
  { charset: "utf-8" },
  { title: "First Home Buyer Chat" },
  {
    name: "description",
    content:
      "An intelligent chat assistant for australian first home buyers. Ask about govt scheme eligibility and how home loans work in NSW, VIC, QLD. Includes FHOG, FHSS, FHBG, FHBAS, FHG",
  },
  { name: "viewport", content: "width=device-width,initial-scale=1" },
  { property: "og:title", content: "First Home Buyer Chat" },
  {
    property: "og:description",
    content: "An intelligent chat assistant for australian first home buyers. Ask about govt scheme eligibility and how home loans work in NSW, VIC, QLD. Includes FHOG, FHSS, FHBG, FHBAS, FHG",
  },
  { property: "og:url", content: "https://chat.firsthomebuyer.help" },
  {
    property: "og:image",
    content: "https://chat.firsthomebuyer.help/cover.jpg",
  },
];

export const links: LinksFunction = () => [{ rel: "icon", href: "/favicon.ico" }];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Analytics />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
