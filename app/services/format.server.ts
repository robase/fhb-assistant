
export function chatHistoryToString(messages: Array<{ author: "user" | "model"; content: string; createdAt: Date }>): string {
  if (messages.length === 0) {
    return "";
  }
  if (messages.length === 1) {
    const message = messages[0];
    if (message.author === "user") {
      return `User question ${new Date(message.createdAt).toLocaleString()}:
      ${message.content}
      ---`;
    }
    return `Your previous answer:
    ${message.content}
    ---`;
  }
  const [first, second, ...rest] = messages;

  if (first.author === "user" && second.author === "model") {
    return (
      `
    User question at ${new Date(first.createdAt).toLocaleString()}:
    ${first.content}
    Your previous answer:
    ${second.content}
    ---` + chatHistoryToString(rest)
    );
  }
  return chatHistoryToString([first]) + chatHistoryToString([second, ...rest]);
}

export function contentToString(docs: { name: string; pageContent: string; similarity: number; }[]) {
  return docs.map(({ pageContent }) => `<doc>${pageContent}</doc>`).join("\r\n");
}