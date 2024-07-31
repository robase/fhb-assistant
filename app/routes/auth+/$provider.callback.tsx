import { LoaderFunctionArgs, json } from "@vercel/remix";
import { authenticator } from "~/services/auth/auth.server";

export const loader = ({ request, params }: LoaderFunctionArgs) => {
  const { provider } = params;

  if (!provider) {
    return json({ error: "Bad request" }, { status: 400 });
  }

  return authenticator.authenticate(provider, request, {
    successRedirect: "/chat",
    failureRedirect: "/login",
  });
};
