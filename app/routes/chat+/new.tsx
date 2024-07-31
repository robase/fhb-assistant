import { HouseSimple } from "@phosphor-icons/react/dist/icons/HouseSimple";
import { MetaFunction, redirect } from "@vercel/remix";
import { Form } from "@remix-run/react";
import { SuggestionBox } from "./$chatId";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/shadcdn/ui/tooltip";

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

export const action = async () => redirect("/login");

export default function SingleChat() {
  return (
    <div className="h-[calc(100%-64px)] relative">
      <div className="w-full md:max-h-[calc(100%-90px)] max-md:max-h-[calc(100%-56px)] pb-6 justify-end overflow-y-auto items-center font-light h-full">
        <div className="flex flex-col justify-center w-full h-full max-w-3xl gap-4 px-2 pt-4 mx-auto">
          <div className="flex justify-center w-full">
            <div className="grid gap-4 sm:grid-cols-2">
              <SuggestionBox question="What is the First Home Owner's Grant?" />
              <SuggestionBox question="How does LMI affect how big my deposit needs to be?" />
              <SuggestionBox question="What are the eligibility criteria for the FHBAS?" />
              <SuggestionBox question="Does buying as a couple change what schemes I can apply for?" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 flex flex-row justify-center w-full px-4 md:pb-8 bg-neutral-50 bg-opacity-20">
        <div className="w-full max-w-2xl py-2 pl-4 pr-2 bg-white shadow-2xl rounded-2xl group focus-within:ring-1 ring-neutral-400">
          <Form method="post" className="flex items-center justify-end gap-2 pr-2 text-black">
            <input
              name="prompt"
              autoComplete="off"
              type="text"
              required
              minLength={1}
              placeholder="Ask a question..."
              className="w-full py-2 text-sm text-black bg-white border-0 shadow-none outline-none resize-none ring-0 shadow-inner-none"
            />
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="submit"
                  className="px-2 py-2 border rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 ring-neutral-400"
                >
                  <HouseSimple className="w-6 h-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="border shadow-lg bg-neutral-50 rounded-xl">
                Ask
              </TooltipContent>
            </Tooltip>
          </Form>
        </div>
      </div>
    </div>
  );
}
