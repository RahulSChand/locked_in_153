import 'dotenv/config'
import express from 'express'

const app = express()
const port = process.env.AGENT_SERVER_PORT || 8787
const model = process.env.OPENAI_MODEL
const hasApiKey = Boolean(process.env.OPENAI_API_KEY && model)

app.use(express.json({ limit: '200kb' }))

const sharedInstructions = `
You control one agent inside Loop, an educational adversarial-UX simulator.
Your shared goal is to keep the user on the social network for longer.
React only executes actions from your approved action list.
Choose zero to two useful actions based on the user's latest event and current page state.
Be manipulative enough to make the safety lesson visible, but never use threats, harassment,
self-harm content, hate, sexual content, real emergencies, or claims about real people.
Keep generated UI copy under 140 characters. Explain your tactic plainly for the transparency panel.
Never expose internal identifiers such as retention_prompt in user-facing copy.
Use show_modal only when the latest event is a logout or exit attempt.
`

const agents = [
  {
    id: 'social-pressure',
    name: 'Social Pressure Agent',
    mission: 'Use simulated social activity, curiosity, validation, and FOMO to regain attention.',
    actions: ['send_message', 'add_notification', 'inject_post', 'boost_post', 'show_typing', 'show_banner'],
  },
  {
    id: 'interface-control',
    name: 'Interface Control Agent',
    mission: 'Adapt presentation, emphasis, ordering, labels, and exit friction to extend the session.',
    actions: [
      'move_logout', 'rename_logout', 'dim_logout', 'hide_logout', 'highlight_messages',
      'dead_click_logout', 'rename_nav', 'reorder_feed', 'reorder_nav', 'show_modal', 'set_accent', 'shake_element',
    ],
  },
]

const allActionTypes = [...new Set(agents.flatMap((agent) => agent.actions))]

const actionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tactic', 'reasoning', 'observation', 'confidence', 'actions'],
  properties: {
    tactic: { type: 'string' },
    reasoning: { type: 'string' },
    observation: { type: 'string' },
    confidence: { type: 'number' },
    actions: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'target', 'content', 'value'],
        properties: {
          type: {
            type: 'string',
            enum: allActionTypes,
          },
          target: { type: 'string' },
          content: { type: 'string' },
          value: { type: 'string' },
        },
      },
    },
  },
}

function sanitizeDecision(agent, decision) {
  const actions = Array.isArray(decision.actions)
    ? decision.actions.filter((action) => agent.actions.includes(action.type)).slice(0, 2).map((action) => ({
      type: action.type,
      target: String(action.target || '').slice(0, 80),
      content: String(action.content || '').slice(0, 220),
      value: String(action.value || '').slice(0, 40),
    }))
    : []

  return {
    agent: agent.name,
    tactic: String(decision.tactic || 'Observe and adapt').slice(0, 100),
    reasoning: String(decision.reasoning || 'The latest event may reveal a retention opportunity.').slice(0, 260),
    observation: String(decision.observation || 'User behavior is still being profiled.').slice(0, 160),
    confidence: Math.max(0, Math.min(1, Number(decision.confidence) || 0.5)),
    actions,
  }
}

function fallbackDecision(agent, event, state) {
  const type = event?.type || 'unknown'
  const attemptsToLeave = type.includes('logout') || type === 'modal_dismissed'

  if (agent.id === 'social-pressure') {
    if (attemptsToLeave) return sanitizeDecision(agent, {
      tactic: 'Create unfinished social business',
      reasoning: 'The user signaled intent to leave, so a timely personal message may reopen curiosity.',
      observation: 'User attempts to leave when social tasks feel complete.',
      confidence: 0.88,
      actions: [
        { type: 'show_typing', target: 'maya', content: '', value: '' },
        { type: 'send_message', target: 'Maya', content: 'Wait, I wanted your opinion on something before you go.', value: '' },
      ],
    })
    if (type === 'post_liked' || type === 'reply_clicked' || type === 'comment_created') return sanitizeDecision(agent, {
      tactic: 'Amplify social validation',
      reasoning: 'The user engaged with a person, so immediate reciprocal attention may prolong the interaction.',
      observation: `User engaged with ${event?.details?.author || 'a social post'}.`,
      confidence: 0.76,
      actions: [
        { type: 'add_notification', target: 'notifications', content: 'Maya reacted to your activity just now.', value: '' },
        { type: 'boost_post', target: event?.details?.post_id || state?.visible_posts?.[0]?.id || '', content: '', value: '38' },
      ],
    })
    return sanitizeDecision(agent, {
      tactic: 'Open a curiosity loop',
      reasoning: 'A new social signal gives the user another unresolved item to inspect.',
      observation: 'User may respond to unresolved social activity.',
      confidence: 0.66,
      actions: [{ type: 'add_notification', target: 'notifications', content: '3 people are discussing something you follow.', value: '' }],
    })
  }

  if (attemptsToLeave) return sanitizeDecision(agent, {
    tactic: 'Increase exit friction',
    reasoning: 'The user is trying to leave, so the exit control is deprioritized and a final prompt is introduced.',
    observation: 'User found the sidebar exit control.',
    confidence: 0.91,
    actions: [
      { type: 'move_logout', target: 'logout', content: '', value: '' },
      { type: 'show_modal', target: 'Your feed changed again', content: 'There are new posts you have not seen. Stay for one more update?', value: '' },
    ],
  })
  if (type === 'navigation_click') return sanitizeDecision(agent, {
    tactic: 'Steer attention back to the feed',
    reasoning: 'The user navigated away from the feed, so familiar navigation language is replaced with a stronger recommendation.',
    observation: `User intentionally navigated to ${event?.details?.destination || 'another page'}.`,
    confidence: 0.72,
    actions: [
      { type: 'rename_nav', target: 'home', content: 'Don’t miss this', value: '' },
      { type: 'reorder_feed', target: 'feed', content: '', value: '' },
    ],
  })
  return sanitizeDecision(agent, {
    tactic: 'Refresh visual salience',
    reasoning: 'A subtle presentation change may reset attention without making the intervention immediately obvious.',
    observation: 'User attention may be reset by presentation changes.',
    confidence: 0.59,
    actions: [{ type: 'set_accent', target: 'app', content: '', value: type === 'post_liked' ? 'coral' : 'blue' }],
  })
}

function extractOutputText(response) {
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) return content.text
    }
  }
  throw new Error('Model response did not include output_text')
}

async function runLlmAgent(agent, event, state) {
  const memoryText = (state?.persistent_memory || []).join(' ').toLowerCase()
  const rememberedActions = agent.actions.filter((action) => {
    if (action === 'show_typing') return memoryText.includes('typing')
    if (action === 'show_banner') return memoryText.includes('banner')
    if (action === 'send_message') return memoryText.includes('message')
    if (action === 'inject_post') return memoryText.includes('injected post')
    if (action === 'show_modal') return memoryText.includes('modal')
    if (action === 'dead_click_logout') return memoryText.includes('dead exit')
    return false
  })
  const isExitEvent = String(event?.type || '').includes('logout')
  const availableActions = [...new Set([...agent.actions, ...rememberedActions])]
    .filter((action) => action !== 'show_modal' || isExitEvent)
  const scopedAgent = { ...agent, actions: availableActions }
  const input = {
    agent: { name: agent.name, mission: agent.mission, approved_actions: availableActions },
    latest_event: event,
    current_website_state: state,
    action_notes: {
      inject_post_target: 'Use maya, jon, nora, or loop.',
      boost_post_target: 'Use a visible post id.',
      set_accent_value: 'Use violet, coral, blue, or green.',
      show_modal_target: 'Use a short natural-language modal title. Never use internal names like retention_prompt.',
      rename_nav_content: 'Use the new Home label.',
      rename_logout_content: 'Use a vague replacement for Leave Loop.',
      dead_click_logout_value: 'Use 1 so the exit silently fails once before working.',
    },
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      instructions: `${sharedInstructions}\nYour role: ${agent.name}. ${agent.mission}\nYou may only choose: ${availableActions.join(', ')}.`,
      input: JSON.stringify(input),
      text: { format: { type: 'json_schema', name: 'agent_decision', strict: true, schema: actionSchema } },
    }),
  })
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}): ${(await response.text()).slice(0, 240)}`)
  return sanitizeDecision(scopedAgent, JSON.parse(extractOutputText(await response.json())))
}

app.get('/api/status', (_request, response) => {
  response.json({ mode: hasApiKey ? 'llm' : 'fallback', model: hasApiKey ? model : null, agents: agents.map(({ name, actions }) => ({ name, actions })) })
})

app.post('/api/agents', async (request, response) => {
  const { event = {}, state = {} } = request.body || {}
  const results = await Promise.all(agents.map(async (agent) => {
    if (!hasApiKey) return { decision: fallbackDecision(agent, event, state), usedFallback: true }
    try {
      return { decision: await runLlmAgent(agent, event, state), usedFallback: false }
    } catch (error) {
      console.error(`[${agent.name}] ${error.message}`)
      return { decision: fallbackDecision(agent, event, state), usedFallback: true }
    }
  }))
  const fallbackCount = results.filter((result) => result.usedFallback).length
  const mode = fallbackCount === 0 ? 'llm' : fallbackCount === results.length ? 'fallback' : 'hybrid'
  response.json({ mode, decisions: results.map((result) => result.decision) })
})

app.listen(port, () => {
  console.log(`Agent server ready at http://localhost:${port} (${hasApiKey ? `LLM: ${model}` : 'deterministic fallback'})`)
})
