import { Authenticator } from "remix-auth";
import { GoogleStrategy, SocialsProvider, LinkedinStrategy } from "remix-auth-socials";
import { sessionStorage } from "./session.server";
import { AuthenticatedUser, upsertUser } from "~/services/models/user.server";

export const authenticator = new Authenticator<AuthenticatedUser>(sessionStorage, {
  sessionKey: process.env.SESSION_KEY,
});

const getCallback = (provider: SocialsProvider) => {
  return process.env.NODE_ENV === 'development' ? `http://localhost:3000/auth/${provider}/callback` : `https://chat.firsthomebuyer.help/auth/${provider}/callback`;
};

export interface AuthenticatingUser {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  email: string;
  email_verified: boolean;
  provider: SocialsProvider;
}

authenticator.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: getCallback(SocialsProvider.GOOGLE),
    },
    async ({ profile }) => {
      const authUser: AuthenticatingUser = { ...profile._json, provider: SocialsProvider.GOOGLE };

      const [dbUser] = await upsertUser(authUser);
      return dbUser;
    }
  )
);

authenticator.use(
  new LinkedinStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      callbackURL: getCallback(SocialsProvider.LINKEDIN),
    },
    async ({ profile }) => {
      const authUser: AuthenticatingUser = { ...profile._json, provider: SocialsProvider.LINKEDIN };

      const [dbUser] = await upsertUser(authUser);
      return dbUser;
    }
  )
);

export function isAuthenticated302(request: Request) {
  return authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
}

export function isAuthenticatedNoRedirect(request: Request) {
  return authenticator.isAuthenticated(request);
}
