import { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction, SerializeFrom, json, redirect } from "@vercel/remix";
import { Form, Link, Outlet, useLoaderData, useLocation, useNavigation, useParams } from "@remix-run/react";
import { Chat, createChat, getUserChat, getChats as listChats } from "~/services/models/chats.server";
import { isAuthenticated302, isAuthenticatedNoRedirect } from "~/services/auth/auth.server";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/shadcdn/ui/avatar";
import { CircleNotch } from "@phosphor-icons/react/dist/icons/CircleNotch";
import { HouseSimple } from "@phosphor-icons/react/dist/icons/HouseSimple";
import { PlusSquare } from "@phosphor-icons/react/dist/icons/PlusSquare";
import { SignOut } from "@phosphor-icons/react/dist/icons/SignOut";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/shadcdn/ui/tooltip";
import { cn } from "~/components/shadcdn-utils";
import { WithSidebar } from "~/components/WithSidebar";
import { AuthenticatedUser, getUser, updateUser } from "~/services/models/user.server";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/shadcdn/ui/alert-dialog";

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

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const user = await isAuthenticatedNoRedirect(request);

  const onNewRoute = request.url.endsWith("new");
  // If a user has not signed up, redirect them to unauthenticated chat page
  if (!user && !onNewRoute) {
    return redirect("/chat/new");
  }

  if (user) {
    const { chatId } = params;

    const chats = await listChats(user.id);

    // user is logged in but not currently looking at a chat
    if (!chatId && chats.length > 0) {
      return redirect(`/chat/${chats[0].id}`);
    }

    // instantiate a new chat if the user has no chats
    if (chats.length === 0) {
      const [newChat] = await createChat(user.id);

      return redirect(`/chat/${newChat.id}`);
    }

    const dbUser = await getUser(user.id);

    if (dbUser) {
      const threesDaysAgo = new Date();
      threesDaysAgo.setDate(threesDaysAgo.getDate() - 3);

      const showDialog = !dbUser.lastShownWarning || new Date(dbUser.lastShownWarning) < threesDaysAgo;

      if (showDialog) {
        await updateUser(user.id, { lastShownWarning: new Date() });
      }

      return json({ user, chats, showDialog });
    }

    return json({ user: null, chats: [] as Chat[], showDialog: false });
  }

  return json({ user: null, chats: [] as Chat[], showDialog: false });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await isAuthenticated302(request);

  const formData = await request.formData();
  const chatId = formData.get("chatId") as string;

  const chats = await listChats(user.id);

  // If no chatId is provided, redirect to the first chat in the list
  // or create a new chat
  if (!chatId) {
    // instantiate a new chat if the user has no chats
    if (chats.length === 0) {
      const [newChat] = await createChat(user.id);

      return redirect(`/chat/${newChat.id}`);
    } else {
      // redirect to the first chat in the list
      return redirect(`/chat/${chats[0].id}`);
    }
  }

  // If the chatId is provided, check if the current chat has any messages
  const currentChat = await getUserChat(user.id, chatId);

  if (!currentChat) {
    console.error("Chat not found", chatId, user.id);
    return json({ error: "Something went wrong" }, { status: 500 });
  }

  const currentChatHasMessages = currentChat.messages.length > 0;

  if (!currentChatHasMessages) {
    return json(null, { status: 200 });
  }

  const latestChatIsEmpty = chats && chats.length > 0 && chats[0].messages.length === 0;

  if (latestChatIsEmpty) {
    return redirect(`/chat/${chats[0].id}`);
  }

  const [newChat] = await createChat(user.id);

  return redirect(`/chat/${newChat.id}`);
};

const getUserInitials = (firstName: string | null, lastName: string | null, displayName: string | null) => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`;
  }

  if (displayName) {
    return displayName[0];
  }

  return "Me";
};

const UserIcon = ({ user }: { user: SerializeFrom<AuthenticatedUser | null> }) => {
  return (
    <Avatar>
      {user ? (
        <>
          {user.picture_url && <AvatarImage src={user.picture_url} alt="profile image" />}
          <AvatarFallback>{getUserInitials(user.given_name, user.family_name, user.display_name)}</AvatarFallback>
        </>
      ) : (
        <AvatarFallback className="bg-blue-200">ME</AvatarFallback>
      )}
    </Avatar>
  );
};

export default function ChatLayout() {
  const { user, chats, showDialog } = useLoaderData<typeof loader>();
  const { chatId } = useParams();

  return (
    <TooltipProvider>
      <WithSidebar
        key={useLocation().pathname}
        sidebarContent={() => SideBarContent({ chats })}
        mobileDashboardHeader={() => (
          <div className="flex w-full">
            <Form id="new-chat" method="post" className="flex items-center justify-end md:hidden">
              <input type="hidden" name="chatId" value={chatId} />
              <button
                form="new-chat"
                formTarget=""
                type="submit"
                className="p-1 text-black rounded-lg hover:bg-neutral-200"
              >
                <PlusSquare className="w-8 h-8 " />
              </button>
            </Form>
            <div className="flex items-center justify-center w-full gap-2 ml-2 text-neutral-900">
              <HouseSimple weight="thin" className="text-3xl " />
              <h1 className="text-xl font-thin">FHB Assistant</h1>
            </div>
          </div>
        )}
      >
        <div className="relative flex md:h-full max-md:h-[calc(100%-64px)] max-w-full flex-1 flex-col overflow-hidden bg-neutral-100">
          <div className="sticky top-0 z-10 flex items-center justify-between h-16 p-3 font-semibold max-md:hidden bg-neutral-100">
            <div className="flex items-center gap-2 ml-2">
              <HouseSimple weight="thin" className="text-3xl text-neutral-700" />
              <h1 className="text-xl font-thin">FHB Assistant</h1>
            </div>
            <div className="flex gap-2 pr-1">
              <UserIcon user={user} />
            </div>
          </div>
          <Outlet />
        </div>
      </WithSidebar>
      <TermsDialog showDialog={showDialog} />
    </TooltipProvider>
  );
}

function SideBarContent({ chats }: { chats: SerializeFrom<Chat>[] }) {
  const { user } = useLoaderData<typeof loader>();
  const { chatId } = useParams();

  const navigation = useNavigation();

  const isSubmitting = navigation.formAction === "/chat";

  return (
    <div className="flex flex-col h-full py-2 font-light bg-neutral-50">
      <Form id="new-chat" method="post" className="flex items-center justify-end px-2 pb-2 max-md:hidden">
        <input type="hidden" name="chatId" value={chatId} />
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              form="new-chat"
              disabled={isSubmitting}
              type="submit"
              className="px-2 py-1 rounded-xl hover:bg-neutral-200"
            >
              {isSubmitting ? (
                <CircleNotch weight="light" className="w-8 h-8 text-neutral-700 animate-spin" />
              ) : (
                <PlusSquare weight="light" className="w-8 h-8 text-neutral-700" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="border shadow-lg bg-neutral-50 rounded-xl">
            <p>New chat</p>
          </TooltipContent>
        </Tooltip>
      </Form>
      <div className="flex-1 overflow-y-auto">
        <ol className="flex flex-col gap-1 px-2 mt-4">
          {chats.length > 0 ? (
            chats.map((chat) => <ChatItem key={chat.id} chat={chat} />)
          ) : (
            <ChatItem
              chat={{ createdAt: new Date().toISOString(), id: "", llmId: "", ownerId: "", title: "New chat" }}
            />
          )}
        </ol>
      </div>
      <div className="flex justify-between px-2 pt-2 max-md:p-2">
        <div className="md:hidden">
          <UserIcon user={user} />
        </div>
        <Form action="/logout" method="post">
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <button type="submit" className="p-2 rounded-xl hover:bg-neutral-200">
                <SignOut className="w-8 h-8" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="ml-2 border shadow-lg bg-neutral-50 max-md:hidden rounded-xl">
              <p>Sign out</p>
            </TooltipContent>
          </Tooltip>
        </Form>
      </div>
    </div>
  );
}

function ChatItem({ chat }: { chat: SerializeFrom<Chat> }) {
  const { pathname } = useLocation();
  return (
    <li>
      <Link to={pathname.endsWith("/new") ? "/login" : `/chat/${chat.id}`}>
        <div
          className={cn(
            "group items-center gap-2 py-3 px-3 border border-neutral-50 relative rounded-xl flex justify-between hover:bg-neutral-100",
            {
              "bg-neutral-50 border border-neutral-400": chat.id === useParams().chatId || pathname.endsWith("/new"),
            }
          )}
        >
          <div className="relative overflow-hidden text-sm grow whitespace-nowrap text-ellipsis" dir="auto">
            {chat.title ?? format(chat.createdAt, "do MMMM")}
          </div>
        </div>
      </Link>
    </li>
  );
}

function TermsDialog({ showDialog }: { showDialog?: boolean }) {
  return (
    <AlertDialog defaultOpen={showDialog || false}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Welcome!</AlertDialogTitle>
          <AlertDialogDescription className="pt-2 text-neutral-900">
            FHB Assistant is a proof of concept with work in progress
            <br />
            <br />
            Although{" "}
            <Link
              to="https://cloud.google.com/use-cases/retrieval-augmented-generation?hl=en"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              Retrieval Augmented Generation (RAG)
            </Link>{" "}
            is used to improve the accuracy of responses, there remains <b>no guarantee of correctness</b> as responses
            generated by a large language model can return{" "}
            <Link
              to="https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence)"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              incorrect or misleading information
            </Link>
            <br />
            <br />
            All information provided is general in nature and should not be considered as professional or personal
            advice
            <br />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Acknowledge</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
