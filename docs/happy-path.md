In my understanding the flow should be like this (and this is the happy-path) :

- A MCP Client like Claude Desktop connects to this MCP-server using SSE
- It retrieves the tools, which are:
  - Invoke, this will invoke the MCP-servers Agent implementation and asks it to handle a task
    - params; MCP-server config (so all the tools Claude has are passed to the MCP-server), LLM config (which provider/model to use), prompt (the instructions), delayedExecution (boolean, indicating that the agent can return the response asynchroniously)
    - returns; a response, or if delayedExecution was enabled; a taskID (random ID)
  - DelayedResponse, returns either the response from the agent or a status indicating the agent is still working on the task
    - params; taskID
    - returns; the response of the agent or a in-progress-status
- A User asks Claude to do something, like doing research, or create an app. For this example we ask Claude to do deep research to the cause of stress in dogs
- Claude Desktop decides to spawn an SkyNet agent with instructions, we call this instance A. Instruction examples; research online for causes of stress in dogs, or research medication that could help dogs relax.
- Skynet Instance A has the same MCP servers as Claude Desktop has; these can be tools to search online, save information to memory, handle files locally, write and execute code and calling another SkyNet-MCP server to hand off another agentic task.
- The Skynet MCP instance A decides to use a online search tool to search for the topic, and spawns another Skynet MCP (instance B) to have the result summarized.
- Meanwhile Claude Desktop is polling Skynet instance A for a result.
- Skynet Instance B returns it's summary to Skynet Instance A, Claude Desktop retrieves that result from the polling to the tool DelayedResponse and returns the response to the user
