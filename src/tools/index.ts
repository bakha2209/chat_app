import OpenAI from "openai";

const openAI = new OpenAI();

async function callOpenAIWithTools() {
  const context: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant that gives information about the time of day and order status.",
    },
    { role: "user", content: "What is status of order 1235?" },
  ];

  const response = await openAI.chat.completions.create({
    model: "gpt-4o",
    messages: context,
    tools: [
      {
        type: "function",
        function: {
          name: "getTimeOfDay",
          description: "Get the current time of day",
        },
      },
      {
        type: "function",
        function: {
          name: "getOrderStatus",
          description: "Return the status of an order",
          parameters: {
            type: "object",
            properties: {
              orderid: {
                type: "string",
                description: "The id of the order to get the status of",
              },
            },
            required: ["orderid"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });

  const willInvokeFunction = response.choices[0].finish_reason === "tool_calls";

  if (willInvokeFunction && response.choices[0].message.tool_calls) {
    const toolCall = response.choices[0].message.tool_calls[0];

    // Type check: ensure it's a function tool call
    if (toolCall.type === "function") {
      const toolName = toolCall.function.name;

      if (toolName === "getTimeOfDay") {
        const toolResponse = getTimeOfDay();

        // Add the assistant's message with tool calls
        context.push(response.choices[0].message);

        // Add the tool response
        context.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResponse,
        });

        // Get the final response from OpenAI
        const secondResponse = await openAI.chat.completions.create({
          model: "gpt-4o",
          messages: context,
        });

        console.log(secondResponse.choices[0].message.content);
      }

      if (toolName === "getOrderStatus") {
        const rawArgument = toolCall.function.arguments;
        const parsedArguments = JSON.parse(rawArgument);
        const toolResponse = getOrderstatus(parsedArguments.orderid);
        context.push(response.choices[0].message);

        // Add the tool response
        context.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResponse,
        });
      }
    } else {
      // Handle case where no tool was called
      console.log(response.choices[0].message.content);
    }
  }
}

// You'll also need to implement this function
function getTimeOfDay(): string {
  const now = new Date();
  return now.toLocaleTimeString();
}
function getOrderstatus(orderId: string) {
  console.log(`Getting order status for order ID: ${orderId}`);
  const orderAsNumber = parseInt(orderId);
  if (orderAsNumber % 2 === 0) {
    return "IN_PROGRESS";
  }
  return "COMPLETED";
}

callOpenAIWithTools();
