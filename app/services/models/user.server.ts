import { eq } from "drizzle-orm";
import { SocialsProvider } from "remix-auth-socials";
import { AuthenticatingUser } from "~/services/auth/auth.server";
import { db } from "~/services/db/client.server";
import { users } from "~/services/db/schema";

export type AuthenticatedUser = typeof users.$inferSelect;

const getProviderPrefix = (provider: SocialsProvider) => {
  switch (provider) {
    case SocialsProvider.GOOGLE:
      return "gg";
    case SocialsProvider.LINKEDIN:
      return "li";
    default:
      throw new Error("Invalid provider");
  }
};

const buildUserId = (user: AuthenticatingUser) => {
  return `${getProviderPrefix(user.provider)}_${user.sub}`;
};

export async function updateUser(userId: string, user: Partial<Omit<AuthenticatedUser, "id">>) {
  return db.update(users).set(user).where(eq(users.id, userId)).returning();
}

export async function upsertUser(user: AuthenticatingUser): Promise<AuthenticatedUser[]> {
  return db
    .insert(users)
    .values({
      id: buildUserId(user),
      auth_subject: user.sub,
      display_name: user.name,
      email: user.email,
      email_verified: user.email_verified,
      family_name: user.family_name,
      given_name: user.given_name,
      locale: user.locale,
      picture_url: user.picture,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        display_name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        family_name: user.family_name,
        given_name: user.given_name,
        locale: user.locale,
        picture_url: user.picture,
      },
    })
    .returning();
}

export async function getUser(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}