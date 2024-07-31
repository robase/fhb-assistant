import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/react";
import { isAuthenticatedNoRedirect } from "~/services/auth/auth.server";

export const loader = async ({request}: LoaderFunctionArgs) => {
  const user = await isAuthenticatedNoRedirect(request);

  if (user) {
    return redirect("/chat");
  }

  return redirect("/chat/new");
};
