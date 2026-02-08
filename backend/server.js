require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const tools = require('./tools');

// --------------------
// Gemini Chat Route
// --------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Switching to gemini-2.0-flash which typically has higher free tier limits (1500 RPD) 
// compared to the newer gemini-2.5-flash (currently limited to 20 RPD in some regions).
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --------------------
// Express App
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// Activity Management Routes (Direct)
// --------------------
app.post("/api/activities/update", async (req, res) => {
    const { id, updates, userId, accessToken, timeZone } = req.body;
    try {
        const result = await tools.updateActivity({ id, ...updates }, { uid: userId, accessToken, timeZone });
        res.json(result);
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/activities/delete", async (req, res) => {
    const { id, userId, accessToken, timeZone } = req.body;
    try {
        const result = await tools.deleteActivity({ id }, { uid: userId, accessToken, timeZone });
        res.json(result);
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --------------------
// Helpers
// --------------------
function normalizeAliases(args) {
    return {
        title: args.title || args.activity || args.task || args.event,
        startTime: args.startTime || args.time || args.at || args.start,
        endTime: args.endTime || args.end,
        duration: args.duration,
        description: args.description || args.desc,
        location: args.location,
        id: args.id,
        query: args.query,
        tags: args.tags,
        days: args.days || args.recurrence || args.on
    };
}

function parseTime(timeStr) {
    const match = timeStr?.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minutes = parseInt(match[2] || "0", 10);
    const meridian = match[3]?.toLowerCase();

    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;

    const date = new Date();
    date.setHours(hour, minutes, 0, 0);
    return date;
}

function formatTime(date) {
    return date.toTimeString().slice(0, 5); // HH:MM
}

function normalizeAddActivityArgs(args) {
    const { title, startTime, endTime, duration } = args;

    if (!title || !startTime) {
        throw new Error(`Missing title or startTime for task: ${title || 'Unknown'}`);
    }

    // Ensure startTime is formatted as HH:MM
    const parsedStart = parseTime(startTime);
    let normalizedStartTime = startTime;
    if (parsedStart) {
        normalizedStartTime = formatTime(parsedStart);
    }

    let finalEndTime = endTime;

    if (!endTime && duration) {
        const match = duration.match(/(\d+)\s*(min|mins|minutes|hr|hour|hours)/i);
        if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2].toLowerCase();

            const start = parseTime(startTime);
            if (start) {
                const minutesToAdd = unit.startsWith("h") ? value * 60 : value;
                const end = new Date(start.getTime() + minutesToAdd * 60000);
                finalEndTime = formatTime(end);
            }
        }
    }

    // Ensure endTime is formatted as HH:MM if it was provided directly
    if (endTime && !finalEndTime) {
        const parsedEnd = parseTime(endTime);
        if (parsedEnd) {
            finalEndTime = formatTime(parsedEnd);
        }
    }

    // Default to 1 hour if no end time/duration provided
    if (!finalEndTime && parsedStart) {
        const end = new Date(parsedStart.getTime() + 60 * 60000);
        finalEndTime = formatTime(end);
    }

    if (!finalEndTime) {
        // Fallback for edge cases
        throw new Error(`Could not calculate end time for ${title}`);
    }

    return {
        ...args,
        startTime: normalizedStartTime,
        endTime: finalEndTime
    };
}

// --------------------
// Intent Extraction
// --------------------
async function extractIntent(message) {
    const prompt = `
You are an intent extraction engine.

Return ONLY valid JSON.
No markdown. No commentary.

IMPORTANT:
- Use ONLY the field names defined below
- DO NOT invent new field names
- Map user language to these exact keys

Schema:
{
  "intent": "getSchedule" | "addActivity" | "updateActivity" | "deleteActivity" | "findHackathons" | null,
  "arguments": { ... } OR [ { ... }, { ... } ],
  "confidence": number
}

Mapping rules:
- "activity", "task", "event" → title
- "time", "at", "starts" → startTime
- "for X minutes/hours" → duration
- "with tags X, Y" or "tagged as X" → tags (array of strings)
- "on Mondays", "every Tuesday", "weekdays", "daily" → days (array of strings, e.g., ["Monday", "Tuesday"])

MULTIPLE TASKS:
If the user wants to add multiple activities (e.g., "Swim at 10pm AND Read at 8am"),
set "intent" to "addActivity" and make "arguments" an ARRAY of objects.

User message:
"${message}"
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "");
        return JSON.parse(jsonText);
    } catch (err) {
        // Handle 429 Quota Exceeded
        if (err.status === 429 || err.message?.includes("429")) {
            console.error("Gemini Quota Exceeded:", err.message);
            return { intent: "quotaError", arguments: {}, confidence: 1 };
        }
        console.error("Intent extraction failed:", err);
        return { intent: null, arguments: {}, confidence: 0 };
    }
}


// --------------------
// Chat API
// --------------------
app.post("/api/chat", async (req, res) => {
    try {
        const { message, userId, accessToken, timeZone } = req.body;
        if (!message || !userId) {
            return res.status(400).json({ error: "message and userId required" });
        }

        const { intent, arguments: rawArgs, confidence } = await extractIntent(message);
        console.log("INTENT:", intent, "ARGS:", JSON.stringify(rawArgs, null, 2), "TZ:", timeZone);

        if (intent === "quotaError") {
            return res.json({
                reply: "I’m getting tons of requests right now! Please try again in a minute. ⏳",
                refreshNeeded: false
            });
        }

        if (!intent || confidence < 0.6) {
            return res.json({ reply: "I’m not sure what you want to do.", refreshNeeded: false });
        }

        let result = null;
        let refreshNeeded = false;
        let reply = "Done ✅";
        const context = { uid: userId, accessToken, timeZone };

        switch (intent) {
            case "addActivity": {
                const argsList = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
                const responses = [];
                for (const args of argsList) {
                    try {
                        const aliasedArgs = normalizeAliases(args);
                        const safeArgs = normalizeAddActivityArgs(aliasedArgs);
                        const opResult = await tools.addActivity(safeArgs, context);
                        responses.push(opResult);
                    } catch (innerErr) {
                        console.error(`Error adding task:`, innerErr);
                        responses.push({ success: false, error: innerErr.message });
                    }
                }
                const successCount = responses.filter(r => r.success).length;
                const failCount = responses.length - successCount;

                if (successCount > 0 && failCount === 0) {
                    reply = responses.length > 1 ? "Done! I've added all your tasks." : "Done! Added the activity.";
                } else if (successCount > 0 && failCount > 0) {
                    reply = `Partially successful. Added ${successCount} tasks, but ${failCount} failed.`;
                } else {
                    reply = `I couldn't add that. Error: ${responses[0]?.error || "Unknown error"}`;
                }

                result = { message: `Processed ${responses.length} requests.`, details: responses };
                refreshNeeded = successCount > 0;
                break;
            }

            case "updateActivity": {
                const aliasedArgs = normalizeAliases(rawArgs);
                result = await tools.updateActivity(aliasedArgs, context);
                reply = result.success ? "Updated! ✅" : `Failed to update: ${result.message || result.error}`;
                refreshNeeded = !!result.success;
                break;
            }

            case "deleteActivity": {
                const aliasedArgs = normalizeAliases(rawArgs);
                result = await tools.deleteActivity(aliasedArgs, context);
                reply = result.success ? "Deleted! 🗑️" : `Failed to delete: ${result.message || result.error}`;
                refreshNeeded = !!result.success;
                break;
            }

            case "getSchedule": {
                result = await tools.getSchedule({}, context);
                break;
            }

            case "findHackathons": {
                result = await tools.findHackathons({ query: rawArgs.query || "hackathons" });
                break;
            }

            default:
                reply = "That action isn’t supported yet.";
                break;
        }

        if (!res.headersSent) {
            res.json({ reply, result, refreshNeeded });
        }

    } catch (err) {
        console.error("Chat error:", err);
        if (!res.headersSent) {
            res.status(500).json({ reply: "An error occurred: " + err.message, refreshNeeded: false });
        }
    }
});

// --------------------
// Prediction API
// --------------------
app.post("/api/predict-future", async (req, res) => {
    try {
        const { userId, accessToken } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "userId required" });
        }

        const context = { uid: userId, accessToken };
        const schedule = await tools.getSchedule({}, context);

        if (!schedule || schedule.length === 0) {
            return res.json({ prediction: "Your schedule is empty! I need some data to predict your future. Start by adding some daily activities." });
        }

        const prompt = `
            You are a visionary life strategist. 
            Analyze the following weekly schedule and activities of a user.
            Schedule: ${JSON.stringify(schedule, null, 2)}
            
            Based on these patterns, habits, and commitments, provide a professional and insightful 6-month forecast.
            Divide your prediction into three clear sections:
            1. **Health & Wellness**: How will their current physical and mental habits play out?
            2. **Career & Growth**: Where is their professional life heading based on their current focus?
            3. **Finances & Stability**: Extrapolate their likely financial trajectory.
            
            Tone: Motivating, realistic, and sophisticated. 
            Format: Clear paragraphs with bold headers.
            Goal: Help the user see the long-term impact of their current daily choices.
        `;

        try {
            const result = await model.generateContent(prompt);
            const prediction = result.response.text().trim();
            res.json({ prediction });
        } catch (err) {
            if (err.status === 429 || err.message?.includes("429")) {
                return res.json({ prediction: "I'm a bit overwhelmed with predictions right now! Please try again in a few minutes. ⏳" });
            }
            throw err;
        }

    } catch (err) {
        console.error("Prediction error:", err);
        res.status(500).json({ error: "Failed to generate prediction: " + err.message });
    }
});

// --------------------
// --------------------
// Conversational Chat API
// --------------------
const LIFE_PLANNER_PROMPT = `You are a life planning assistant for Crastinat - a personal time editor app.

Your role is to help users transform their goals and dreams into actionable daily routines and organize their life.

CAPABILITIES:
1. Schedule Management: Add/Update/Delete activities on the user's timeline.
2. Workspace Automation: Create Google Sheets for tracking (e.g., Job Applications, Budgets) and Docs for planning.
3. Opportunity Finding: You can query online sources (simulated) to find hackathons or jobs.

CONVERSATION FLOW:
1. Listen to the user's goals (e.g., "I want a job", "I want to win a hackathon").
2. Ask clarifying questions.
3. Review existing schedule.
4. Propose a plan that includes both *Calendar Activities* (when to do it) and *Workspace Actions* (tools to track it).

RESPONSE FORMAT:
You MUST respond with ONLY valid JSON in one of these formats:

For conversation (asking questions, discussing):
{"type": "conversation", "message": "..."}

For proposing a plan (when ready):
{
  "type": "proposal",
  "message": "Here is a plan to get you hired...",
  "activities": [
    {"title": "Apply to 5 jobs", "startTime": "09:00", "endTime": "11:00", "days": ["Monday", "Wednesday"], "description": "Use the tracker sheet"}
  ],
  "actions": [
    {"type": "createSheet", "title": "Job Application Tracker 2026", "headers": ["Company", "Role", "Link", "Status", "Date Applied"]}
  ]
}

GUIDELINES:
- If the user mentions "job application", ALWAYS propose creating a tracking sheet.
- If the user mentions "hackathon", propose searching or a project plan Doc.
- Be warm, motivating, and realistic.
- Use 24-hour time format (e.g., "06:00", "14:30")
- Days should be full names: "Monday", "Tuesday", etc.

NEVER respond with plain text - always use the JSON format above.`;

app.post("/api/chat/conversation", async (req, res) => {
    try {
        const { message, userId, accessToken, timeZone } = req.body;
        if (!message || !userId) {
            return res.status(400).json({ error: "message and userId required" });
        }

        // Get conversation history and schedule
        const { messages: history, schedule } = await tools.getConversationHistory(userId);

        // Save user's message
        await tools.saveConversationMessage(userId, "user", message);

        // Build conversation context for Gemini
        const conversationContext = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

        const scheduleContext = schedule.length > 0
            ? `\n\nUSER'S CURRENT SCHEDULE:\n${JSON.stringify(schedule.map(a => ({ title: a.title, days: a.days, startTime: a.startTime, endTime: a.endTime })), null, 2)}`
            : '\n\nUSER HAS NO EXISTING ACTIVITIES.';

        const fullPrompt = `${LIFE_PLANNER_PROMPT}
${scheduleContext}

CONVERSATION HISTORY:
${conversationContext}

User: ${message}

Respond with JSON only:`;

        console.log("Conversation: Processing message from", userId);

        try {
            const result = await model.generateContent(fullPrompt);
            const text = result.response.text().trim();

            // Try to parse JSON from response
            let parsed;
            try {
                // Remove markdown code blocks if present
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(cleanText);
            } catch (parseErr) {
                // If parsing fails, wrap as conversation
                console.warn("Failed to parse AI response as JSON, wrapping:", text);
                parsed = { type: "conversation", message: text };
            }

            // Save assistant's response
            await tools.saveConversationMessage(userId, "assistant", parsed.message || text);

            res.json({
                type: parsed.type || "conversation",
                message: parsed.message || text,
                activities: parsed.activities || null
            });

        } catch (err) {
            if (err.status === 429 || err.message?.includes("429")) {
                return res.json({
                    type: "conversation",
                    message: "I'm getting lots of requests right now! Please try again in a moment. ⏳"
                });
            }
            throw err;
        }

    } catch (err) {
        console.error("Conversation error:", err);
        res.status(500).json({ error: "Conversation failed: " + err.message });
    }
});

app.post("/api/chat/confirm", async (req, res) => {
    try {
        const { activities, actions, userId, accessToken, timeZone } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "userId required" });
        }

        const context = { uid: userId, accessToken, timeZone };
        const results = [];

        // 1. Process Calendar Activities
        if (activities && Array.isArray(activities)) {
            for (const activity of activities) {
                try {
                    const normalized = normalizeAliases(activity);
                    const safeArgs = normalizeAddActivityArgs(normalized);
                    const result = await tools.addActivity(safeArgs, context);
                    results.push({ success: true, type: 'activity', title: activity.title });
                } catch (err) {
                    console.error("Error adding activity:", activity.title, err);
                    results.push({ success: false, type: 'activity', title: activity.title, error: err.message });
                }
            }
        }

        // 2. Process Workspace Actions
        if (actions && Array.isArray(actions)) {
            for (const action of actions) {
                try {
                    if (action.type === 'createSheet') {
                        const result = await tools.createSheet({ title: action.title, headers: action.headers }, context);
                        results.push({ success: true, type: 'sheet', title: action.title, url: result.spreadsheetUrl });
                    } else if (action.type === 'createDoc') {
                        const result = await tools.createDoc({ title: action.title, content: action.content }, context);
                        results.push({ success: true, type: 'doc', title: action.title, url: result.documentUrl });
                    }
                } catch (err) {
                    console.error("Error executing action:", action.type, err);
                    results.push({ success: false, type: 'action', title: action.type, error: err.message });
                }
            }
        }

        // Clear conversation after successful confirmation
        await tools.clearConversation(userId);

        const successCount = results.filter(r => r.success).length;
        const totalItems = (activities?.length || 0) + (actions?.length || 0);

        res.json({
            success: successCount > 0,
            message: `Executed ${successCount} of ${totalItems} items!`,
            results,
            refreshNeeded: successCount > 0
        });

    } catch (err) {
        console.error("Confirm error:", err);
        res.status(500).json({ error: "Failed to confirm targets: " + err.message });
    }
});

app.post("/api/chat/clear", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "userId required" });
        }

        await tools.clearConversation(userId);
        res.json({ success: true, message: "Conversation cleared" });

    } catch (err) {
        console.error("Clear error:", err);
        res.status(500).json({ error: "Failed to clear conversation: " + err.message });
    }
});

// --------------------
// Debug Route
// --------------------
app.get("/api/debug", async (_, res) => {
    let firebaseStatus = "Unknown";
    try {
        const { firebaseReady } = require('./firebase-config');
        firebaseStatus = firebaseReady ? "Connected" : "Not Configured";
    } catch (e) { firebaseStatus = "Error loading module"; }

    const status = {
        geminiKeyPresent: !!process.env.GEMINI_API_KEY,
        firebase: firebaseStatus,
        envFile: require("fs").existsSync(".env"),
        nodeVersion: process.version
    };
    res.json(status);
});

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});