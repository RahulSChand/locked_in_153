# Loop

Loop is a local multi-agent adversarial UX simulator. A dummy social network
observes meaningful user actions and lets two agents propose interface changes
designed to extend the session:

- **Social Pressure Agent** creates simulated messages, notifications, posts,
  typing indicators, and social validation.
- **Interface Control Agent** changes labels, reorders content, moves the exit,
  and introduces prompts.

The model never writes or executes website code. It receives a compact snapshot
of the visible website and chooses from a server-side action whitelist.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Without an API key, the app uses deterministic
local fallback decisions.

## Connect an OpenAI model

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env`, then restart `npm run dev`.
The two agents will dynamically generate interventions from the latest user
action and visible website state. The API key is read only by `server.js`, is
excluded by `.gitignore`, and is never sent to the browser.

## Compact project structure

- `src/App.jsx`: website, state, event tracking, and action executor
- `src/index.css`: complete visual system
- `server.js`: two agents, prompts, action schema, API call, and fallback logic
- `vite.config.js`: local `/api` proxy
