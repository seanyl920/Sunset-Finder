import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// --- Minimal .env loader (avoids an extra dependency) ---------------------
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const client = hasKey ? new Anthropic() : null;

// A forced tool call guarantees Claude returns spots in exactly this shape —
// no fragile free-text JSON parsing, and it works on the GA Messages endpoint.
const SPOTS_TOOL = {
  name: "provide_sunset_spots",
  description: "Return the curated list of sunset-watching spots.",
  input_schema: {
    type: "object",
    properties: {
      spots: {
        type: "array",
        description: "4 sunset-watching spots, best first.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the sunset-watching spot" },
            why: {
              type: "string",
              description: "One vivid sentence on why it's perfect for sunsets",
            },
            bestTime: {
              type: "string",
              description: "Best time to arrive, e.g. '30 min before sunset'",
            },
          },
          required: ["name", "why", "bestTime"],
        },
      },
    },
    required: ["spots"],
  },
};

app.post("/api/spots", async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error:
        "Claude API is not configured. Add ANTHROPIC_API_KEY to your .env file to enable curated spots.",
    });
  }

  const city = String(req.body?.city || "").trim();
  if (!city) {
    return res.status(400).json({ error: "A city name is required." });
  }

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system:
        "You are a well-traveled local guide with an eye for golden-hour magic. " +
        "Given a city, recommend real, specific places known for spectacular sunset views — " +
        "rooftops, beaches, hilltops, parks, bridges, and overlooks. Favor places that locals " +
        "actually go to. Keep descriptions evocative but concise.",
      messages: [
        {
          role: "user",
          content:
            `Recommend 4 of the best sunset-watching spots in or near ${city}. ` +
            "For each, give the name, one vivid sentence on why it's perfect for sunsets, " +
            "and the best time to arrive relative to sunset.",
        },
      ],
      tools: [SPOTS_TOOL],
      tool_choice: { type: "tool", name: "provide_sunset_spots" },
    });

    const toolUse = message.content.find(
      (b) => b.type === "tool_use" && b.name === "provide_sunset_spots",
    );
    const spots = Array.isArray(toolUse?.input?.spots) ? toolUse.input.spots : [];
    res.json({ spots });
  } catch (err) {
    console.error("Claude request failed:", err?.message || err);
    res
      .status(502)
      .json({ error: "Could not generate sunset spots right now. Please try again." });
  }
});

// Serve the built front-end in production (run `npm run build` first).
const distDir = path.join(ROOT, "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
}

app.listen(PORT, () => {
  console.log(`☀️  Sundown server listening on http://localhost:${PORT}`);
  if (!hasKey) {
    console.warn(
      "⚠️  ANTHROPIC_API_KEY not set — weather forecast works, but curated spots are disabled.",
    );
  }
});
