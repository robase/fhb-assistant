import { ActionFunctionArgs, json, redirect } from "@vercel/remix";
import { authenticator } from "~/services/auth/auth.server";

export const loader = () => redirect("/login");

export const action = ({ request, params }: ActionFunctionArgs) => {
  const { provider } = params;

  if (!provider) {
    return json({ error: "Bad request" }, { status: 400 });
  }

  return authenticator.authenticate(provider, request);
};
