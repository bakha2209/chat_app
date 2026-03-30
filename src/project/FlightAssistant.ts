import OpenAI from "openai";

const openai = new OpenAI();

function getAvailableFlights(departure: string, destination: string): string[] {
  console.log("Getting available flights");
  if (departure === "SFO" && destination === "LAX") {
    return ["UA 123", "AA 456"];
  }
  if (departure === "DFW" && destination === "LAX") {
    return ["AA 789"];
  }
  return ["66 FSFG"];
}

function reserveFlight(flightNumber: string): string | "Fully_BOOKED" {
  if (flightNumber.length == 6) {
    console.log(`Reserving flight ${flightNumber}`);
    return "123456";
  } else {
    return "Fully_BOOKED";
  }
}

const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  {
    role: "system",
    content:
      "You are a helpful assistant that gives information about flights and makes reservations.",
  },
];

async function callOpenAIWithTools() {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: history,
    temperature: 0.0,
    tools: [
      {
        type: "function",
        function: {
          name: "getAvailableFlights",
          description:
            "return the available flights for a given departure and destination",
          parameters: {
            type: "object",
            properties: {
              departure: {
                type: "string",
                description: "The departure airport code",
              },
              destination: {
                type: "string",
                description: "The destination airport code",
              },
            },
            required: ["departure", "destination"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "reserveFlight",
          description: "makes a reservation for a given flight number",
          parameters: {
            type: "object",
            properties: {
              flightNumber: {
                type: "string",
                description: "The flight number to reserve",
              },
            },
            required: ["flightNumber"],
          },
        },
      },
    ],
    tool_choice: "auto",
  });
  const choice = response.choices[0];
  const willInvokeFunction = choice.finish_reason === "tool_calls";

  if (willInvokeFunction && choice.message.tool_calls) {
    const toolCall = choice.message.tool_calls[0];

    // Type check: ensure it's a function tool call
    if (toolCall.type === "function") {
      const functionName = toolCall.function.name;

      if (functionName === "getAvailableFlights") {
        const rawArgument = toolCall.function.arguments;
        const parsedArguments = JSON.parse(rawArgument);
        const flights = getAvailableFlights(
          parsedArguments.departure,
          parsedArguments.destination,
        );

        history.push(response.choices[0].message);
        history.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: flights.toString(),
        });
      }

      if (functionName === "reserveFlight") {
        const rawArgument = toolCall.function.arguments;
        const parsedArguments = JSON.parse(rawArgument);
        const reservation = reserveFlight(parsedArguments.flightNumber);

        history.push(response.choices[0].message);
        history.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: reservation,
        });
      }

      // Get final response after tool execution
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: history,
      });

      if (secondResponse.choices[0].message.content) {
        history.push(secondResponse.choices[0].message);
        console.log(secondResponse.choices[0].message.content);
      }
    }
  } else {
    // Handle regular text response (no tools called)
    if (choice.message.content) {
      history.push(choice.message);
      console.log(choice.message.content);
    }
  }
}

console.log("Hello from flight assistant chatbot");
process.stdin.addListener("data", async function (input) {
  const userInput = input.toString().trim();
  history.push({ role: "user", content: userInput }); // Fixed: should be "user" not "assistant"
  await callOpenAIWithTools();
});
