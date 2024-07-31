import { PromptTemplate } from "@langchain/core/prompts";
import { OpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { questionWithContextTemplate, refineQuestionTemplate, summaryTemplate } from "./prompt-templates.server";
import { chatHistoryToString, contentToString } from "./format.server";
import { findSimilarContents } from "./embeddings.server";

const llm = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o-mini",
  temperature: 0,
  verbose: process.env.NODE_ENV === "development",
});

const refineQuestionChain = RunnableSequence.from([
  (input) => ({ chat_history: chatHistoryToString(input.chat_history), question: input.question }),
  PromptTemplate.fromTemplate(refineQuestionTemplate),
  llm,
  new StringOutputParser(),
]);

const docsChain = RunnableSequence.from([
  {
    question: (input) => input.question,
    context: (input) => contentToString(input.similarContents),
  },
  PromptTemplate.fromTemplate(questionWithContextTemplate),
  llm,
  new StringOutputParser(),
]);

export async function promptLLM(
  question: string,
  chat_history: { author: "user" | "model"; content: string }[],
  state: string
) {
  const refinedQuestion = await refineQuestionChain.invoke({ chat_history, question });

  const similarContents = await findSimilarContents(question, state);

  const result = await docsChain.invoke({ question: refinedQuestion, similarContents });

  return result;
}

const summaryChain = RunnableSequence.from([
  (input) => ({ userPrompt: input.question }),
  PromptTemplate.fromTemplate(summaryTemplate),
  llm,
  new StringOutputParser(),
]);


export async function summariseToTitle(userPrompt: string) {
  return await summaryChain.invoke({
    userPrompt,
  });
}
