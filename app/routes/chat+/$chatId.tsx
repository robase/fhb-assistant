import { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction, SerializeFrom, json, redirect } from "@vercel/remix";
import { Form, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import { cn } from "~/components/shadcdn-utils";
import { isAuthenticated302 } from "~/services/auth/auth.server";
import Markdown from "react-markdown";
import { HouseSimple } from "@phosphor-icons/react/dist/icons/HouseSimple";
import { CircleNotch } from "@phosphor-icons/react/dist/icons/CircleNotch";
import { promptLLM, summariseToTitle } from "~/services/llm.server";
import { Message, createMessage, listMessages } from "~/services/models/messages.server";
import { useEffect, useRef, useState } from "react";
import { getUserChat, updateChat as updateChatTitle } from "~/services/models/chats.server";
import { Separator } from "~/components/shadcdn/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/shadcdn/ui/tooltip";
import remarkGfm from "remark-gfm";

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
    content:
      "An intelligent chat assistant for australian first home buyers. Ask about govt scheme eligibility and how home loans work in NSW, VIC, QLD. Includes FHOG, FHSS, FHBG, FHBAS, FHG",
  },
  { property: "og:url", content: "https://chat.firsthomebuyer.help" },
  {
    property: "og:image",
    content: "https://chat.firsthomebuyer.help/cover.jpg",
  },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {  
  const user = await isAuthenticated302(request);

  const { chatId } = params;

  if (!chatId) {
    return redirect("/chat/new");
  }

  try {
    const messages = await listMessages(chatId, user.id);

    return json({ messages, error: null });
  } catch (error) {
    console.log(error);
    return json({ messages: [] as Message[], error: "Something went wrong" }, { status: 500 });
  }
};

export const ErrorBoundary = () => {
  return <div className="flex items-center justify-center w-full h-full bg-neutral-100"><p>Uh oh, something went wrong!</p></div>
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const user = await isAuthenticated302(request);

  const { chatId } = params;

  if (!chatId) {
    return json({ error: "Bad request" }, { status: 400 });
  }

  const formData = await request.formData();

  const userPrompt = formData.get("prompt") as string;
  const state = (formData.get("state") as string) ?? "NSW";

  if (!userPrompt) {
    return null;
  }

  const [history, currentChat] = await Promise.all([
    listMessages(chatId, user.id, { limit: 4, order: "desc" }),
    getUserChat(user.id, chatId),
  ]);

  const transformHistory = history
    .map((message) => ({ author: message.author, content: message.message, createdAt: message.createdAt }))
    .reverse();

  try {
    await Promise.all([
      createMessage({
        author: "user",
        message: userPrompt,
        ownerId: user.id,
        parentChatId: chatId,
      }),
      createMessage({
        author: "model",
        message: await promptLLM(userPrompt, transformHistory, state),
        ownerId: "open-ai",
        parentChatId: chatId,
      }),
      currentChat?.title ? null : updateChatTitle(chatId, { title: await summariseToTitle(userPrompt) }),
    ]);

    return json(null, { status: 200 });
  } catch (error) {
    console.log(error);
    return json({ error: "Something went wrong" }, { status: 500 });
  }
};

function useChatScroll<T>(dep: T, deps: string[]): React.MutableRefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      // is the user has scrolled up, don't force the page down
      if (ref.current.scrollHeight - ref.current.clientHeight < ref.current.scrollTop + 400) {
        ref.current.scrollTop = ref.current.scrollHeight;
      }
    }
  }, [dep, ...deps]);
  return ref;
}

export default function SingleChat() {
  const { messages } = useLoaderData<typeof loader>();

  const lastMessage = messages[messages.length - 1];

  const [, setCompletedTyping] = useState(
    lastMessage && new Date(lastMessage.createdAt) < new Date(Date.now() - 10000)
  );
  const [displayResponse, setDisplayResponse] = useState("");

  const { state, formAction } = useNavigation();

  const isSubmittingOtherRoute = formAction === "/chat";
  const isSubmittingMessage = state === "submitting" && formAction !== `/chat`;

  const ref = useChatScroll(messages, [state, displayResponse]);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [ref]);

  useEffect(() => {
    setCompletedTyping(false);

    let i = 0;

    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (new Date(lastMessage.createdAt) < new Date(Date.now() - 30000)) {
      setDisplayResponse(lastMessage.message);
      return;
    }

    const stringResponse = lastMessage.message;

    const intervalId = setInterval(() => {
      setDisplayResponse(stringResponse.slice(0, i));

      i += 10;

      if (i > stringResponse.length) {
        if (ref.current) {
          if (ref.current.scrollHeight - ref.current.clientHeight < ref.current.scrollTop + 800) {
            ref.current.scrollTop = ref.current.scrollHeight;
          }
        }

        clearInterval(intervalId);
        setDisplayResponse(stringResponse);
        setCompletedTyping(true);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [messages, ref]);

  const submit = useSubmit();

  return (
    <div className="h-[calc(100%-64px)] relative">
      <div
        ref={ref}
        className={cn(
          "w-full md:max-h-[calc(100%-90px)] max-md:max-h-[calc(100%-56px)] pb-6 justify-end overflow-y-auto items-center font-light",
          {
            "h-full": (!messages || messages.length === 0) && state !== "submitting",
          }
        )}
      >
        <div
          className={cn("flex flex-col max-w-3xl w-full gap-4 mx-auto px-2 pt-4", {
            "justify-end": messages && messages.length > 0,
            "justify-center h-full": (!messages || messages.length === 0) && state !== "submitting",
          })}
        >
          {messages && messages.length > 0 ? (
            messages.map((message, i) => {
              const hasMessages = messages.length > 0;

              if (hasMessages && i === messages.length - 1) {
                return <ChatMessage key={message.id} message={{ ...message, message: displayResponse }} />;
              }

              return (
                <ChatMessage
                  key={message.id}
                  message={i === messages.length - 1 ? { ...message, message: displayResponse } : message}
                />
              );
            })
          ) : (
            <>
              {state !== "loading" && state !== "submitting" && (
                <div className="flex justify-center w-full">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SuggestionBox question="What is the First Home Owner's Grant?" />
                    <SuggestionBox question="Explain LMI and its relation to LVR and total loan amount" />
                    <SuggestionBox question="What are the eligibility criteria for the FHBAS in NSW?" />
                    <SuggestionBox question="How will buying as a couple change what government schemes I am eligible for?" />
                  </div>
                </div>
              )}
            </>
          )}
          {isSubmittingMessage && <ChatLoading />}
        </div>
      </div>
      <div className="absolute bottom-0 flex flex-row justify-center w-full px-4 md:pb-8 bg-neutral-50 bg-opacity-20">
        <div
          className={cn(
            "w-full max-w-2xl bg-white shadow-2xl rounded-2xl pl-4 py-2 pr-2 group focus-within:ring-1 ring-neutral-400",
            {
              "animate-pulse min-h-58 flex justify-center": isSubmittingOtherRoute,
            }
          )}
        >
          {!isSubmittingOtherRoute ? (
            <Form
              onSubmit={(event) => {
                submit(event.currentTarget);
                event.currentTarget.reset();
                event.preventDefault();
              }}
              method="post"
              className="flex items-center justify-end gap-2 pr-2 text-black"
            >
              <input
                name="prompt"
                autoComplete="off"
                type="text"
                disabled={isSubmittingOtherRoute}
                onChange={() => setCompletedTyping(true)}
                required
                minLength={1}
                placeholder="Ask a question..."
                className="w-full py-2 text-sm text-black bg-white border-0 shadow-none outline-none resize-none ring-0 shadow-inner-none"
              />
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="submit"
                    disabled={isSubmittingOtherRoute}
                    className="px-2 py-2 border rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 ring-neutral-400"
                  >
                    <HouseSimple className="w-6 h-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="border shadow-lg bg-neutral-50 rounded-xl">
                  Ask
                </TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-8 mx-2" />

              <StateSelect disabled={isSubmittingOtherRoute} />
            </Form>
          ) : (
            <CircleNotch className="w-8 h-8 my-1 animate-spin" weight="thin" />
          )}
        </div>
      </div>
    </div>
  );
}

export function SuggestionBox({ question }: { question: string }) {
  return (
    <Form method="post">
      <input type="hidden" name="prompt" value={question} />
      <button
        type="submit"
        className="flex w-56 p-4 text-sm text-left transition-transform border rounded-xl max-md:h-28 hover:rotate-1 border-neutral-400 hover:bg-neutral-200 h-36 pr-14"
      >
        <p>{question}</p>
      </button>
    </Form>
  );
}

function ChatMessage({ message }: { message: SerializeFrom<Message> }) {
  return (
    <div
      className={cn("w-full flex", {
        "justify-end": message.author === "user",
        "justify-start": message.author === "model",
      })}
    >
      <div
        className={cn("px-3 py-2 rounded-xl max-w-2xl ", {
          "bg-white border border-neutral-400": message.author === "user",
          "bg-neutral-100 ": message.author === "model",
        })}
      >
        {message.author === "model" && (
          <div className="flex items-center gap-2 py-2 mb-2 text-xs border-b w-fit border-neutral-400">
            <HouseSimple className="w-4 h-4" /> FHB Assistant
          </div>
        )}
        <Markdown
          components={{
            table: ({ children }) => <table className="text-left table-auto">{children}</table>,
          }}
          remarkPlugins={[remarkGfm]}
          className="text-sm prose text-black"
        >
          {`${message.message}` ?? ""}
        </Markdown>
      </div>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="flex justify-start w-full">
      <div className="max-w-2xl px-4 py-2 rounded-xl bg-neutral-100 ">
        <div className="flex items-center gap-2 py-2 mb-2 text-xs border-b w-fit border-neutral-400">
          <HouseSimple className="w-4 h-4" /> FHB Assistant
        </div>
        <div className="mt-3 animate-pulse">
          <CircleNotch className="w-8 h-8 text-blue-900 duration-1000 animate-spin" />
        </div>
      </div>
    </div>
  );
}

function StateSelect({ disabled }: { disabled?: boolean }) {
  return (
    <div>
      <select
        disabled={disabled}
        name="state"
        defaultValue={"NSW"}
        className="bg-neutral-100 w-24 hover:bg-neutral-200 px-3 border hover:border-neutral-400 text-neutral-700 rounded-xl ring-neutral-400 cursor-pointer text-sm block py-2.5"
      >
        <option>ACT</option>
        <option>NSW</option>
        <option>NT</option>
        <option>QLD</option>
        <option>SA</option>
        <option>TAS</option>
        <option>VIC</option>
        <option>WA</option>
      </select>
    </div>
  );
}
