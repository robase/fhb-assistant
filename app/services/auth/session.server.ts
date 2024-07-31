import { createCookieSessionStorage } from "@vercel/remix";

if (!process.env.SESSION_KEY) {
  throw new Error("SESSION_KEY is required");
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax", // this helps with CSRF
    path: "/",
    httpOnly: true, 
    secrets: [process.env.SESSION_KEY],
    secure: process.env.NODE_ENV === "production",
  },
});

// you can also export the methods individually for your own usage
export const { getSession, commitSession, destroySession } = sessionStorage;