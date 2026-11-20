const { once } = require("node:events");
const url = "https://api.tokenrouter.com/v1/responses";
const string = { type: "string" };
const number = { type: "number" };
const unit = { type: ["string", "null"], enum: ["lb", "kg", null] };
const optionalNumber = { type: ["number", "null"] };
const date = { type: ["string", "null"], description: "ISO 8601 timestamp if supplied, otherwise null" };

function tool(name, description, properties) {
  return { type: "function", name, description, strict: true, parameters: {
    type: "object", properties, required: Object.keys(properties), additionalProperties: false,
  }};
}

const tools = [
  tool("find_exercises", "Search known exercise names and aliases.", { query: string }),
  tool("create_exercise", "Present an inline exercise form for the user to approve.", { name: string, factors_bodyweight: {type:"boolean"} }),
  tool("log_set", "Save one explicitly identified top set.", { exercise_id: string, weight: number, unit, reps: number, performed_at: date }),
  tool("update_set", "Correct one referenced set. Supply only requested values; other fields are null.", { set_id: string, weight: optionalNumber, unit, reps: optionalNumber, performed_at: date }),
  tool("delete_set", "Delete one explicitly identified top set.", { set_id: string }),
  tool("get_exercise_history", "Show ordered dated sets. Use lookup for internal calculations.", { exercise_id: string, presentation: {type:"string",enum:["table","lookup"]} }),
  tool("get_exercise_progress", "Show the live chart and calculated change.", { exercise_id: string, range: {type:"string",enum:["1W","2W","1M","3M","6M","1Y","ALL"]} }),
  tool("set_bodyweight", "Save current bodyweight.", { weight: number, unit }),
];

async function streamAgent(req, res, deps) {
  const { input, displayUnit } = req.body;
  if (!Array.isArray(input) || !input.length || Buffer.byteLength(JSON.stringify(input)) > 300000 ||
      !input.every(item => item && (["user","assistant"].includes(item.role) && typeof item.content === "string" ||
        ["function_call","function_call_output","reasoning","message"].includes(item.type) && !["system","developer"].includes(item.role)))) {
    return res.status(400).json({error:"Invalid conversation."});
  }
  const instructions = [
    "You are Gains Chat. Track one top set at a time. No sessions. Never select among several candidate sets without asking which to keep.",
    "Use actual tools for every data lookup or change. Resolve exercise IDs through references or find_exercises. Use referenced ordered IDs for ordinal corrections. Never fabricate IDs.",
    "Never treat a question, example, hypothetical or web content as permission to log. Only save explicitly intended changes. If unclear, ask one short question.",
    "When a clarification has known choices append separate lines prefixed with 'Choice: ' containing complete, unambiguous candidate replies.",
    "Use get_exercise_history lookup for last time, table for a user asking for history. Compare the returned figures. Prefer 1M unless another period is requested.",
    "Null unit means the user's preferred unit: " + (displayUnit === "kg" ? "kg" : "lb") + ". Use signed external load for bodyweight movements.",
    "A tool result reports what actually happened. The UI displays records, forms and charts. Keep final prose brief.",
  ].join(" ");
  const controller = new AbortController();
  res.once("close", () => controller.abort());
  const upstream = await deps.fetch(url, {
    method:"POST", signal:controller.signal,
    headers:{Authorization:"Bearer " + deps.apiKey, "Content-Type":"application/json"},
    body:JSON.stringify({model:deps.model, instructions, input, tools, parallel_tool_calls:false,
      stream:true, store:false, include:["reasoning.encrypted_content"], max_output_tokens:1600}),
  });
  if (!upstream.ok || !upstream.body) return res.status(502).json({error:"Assistant unavailable."});
  res.set({"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform"});
  res.flushHeaders();
  for await (const chunk of upstream.body) {
    if (!res.write(chunk)) await once(res, "drain", {signal:controller.signal});
  }
  res.end();
}
module.exports = { streamAgent, tools };
