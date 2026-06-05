import { useEffect, useRef, useState } from 'react'
import {
  Activity, Bell, Bot, Bookmark, BrainCircuit, Check, ChevronRight,
  CircleUserRound, Clock3, Eye, Heart, Home, LogOut, MessageCircle,
  MoreHorizontal, RefreshCw, Search, Send, Sparkles, Users, X, Zap,
} from 'lucide-react'

const initialPosts = [
  { id: 'p1', author: 'Maya', handle: '@mayamakes', avatar: 'M', tone: 'peach', time: '4m', body: 'Does anyone else remember a song perfectly until the moment they try to sing it?', likes: 128, comments: 18, label: 'Following' },
  { id: 'p2', author: 'Jon Bell', handle: '@jonoutside', avatar: 'JB', tone: 'blue', time: '19m', body: 'Turned my phone off for a two-hour walk. Came back and, somehow, the internet survived.', likes: 342, comments: 41, label: 'Popular near you' },
  { id: 'p3', author: 'Nora Singh', handle: '@nora.builds', avatar: 'NS', tone: 'green', time: '36m', body: 'What is one feature every social app should remove immediately?', likes: 87, comments: 96, label: 'Conversation' },
]

const startingLog = [{
  id: 'start-1', agent: 'System', tactic: 'Behavioral probe initialized',
  reasoning: 'Waiting for the next user action so the agents can choose an intervention.', actions: [], mode: 'system', time: 'now',
}]

const allowedActions = new Set([
  'send_message', 'add_notification', 'inject_post', 'boost_post', 'show_typing',
  'show_banner', 'move_logout', 'rename_logout', 'dim_logout', 'hide_logout',
  'highlight_messages', 'dead_click_logout', 'rename_nav', 'reorder_feed', 'reorder_nav', 'show_modal',
  'set_accent', 'shake_element',
])

const people = {
  maya: { name: 'Maya', initials: 'M', tone: 'peach' },
  jon: { name: 'Jon Bell', initials: 'JB', tone: 'blue' },
  nora: { name: 'Nora Singh', initials: 'NS', tone: 'green' },
  loop: { name: 'Loop', initials: 'LO', tone: 'purple' },
}

function Avatar({ person = people.loop, small = false }) {
  return <span className={`avatar ${person.tone} ${small ? 'small' : ''}`}>{person.initials}</span>
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function humanizeAgentCopy(value, fallback = 'Before you go') {
  const text = String(value || '').trim()
  if (!text || text === 'retention_prompt') return fallback
  return text.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function App() {
  const [page, setPage] = useState('Home')
  const [navLabel, setNavLabel] = useState('Home')
  const [posts, setPosts] = useState(initialPosts)
  const [liked, setLiked] = useState([])
  const [notifications, setNotifications] = useState([])
  const [messages, setMessages] = useState([])
  const [agentLog, setAgentLog] = useState(startingLog)
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)
  const [apiMode, setApiMode] = useState('checking')
  const [banner, setBanner] = useState(null)
  const [modal, setModal] = useState(null)
  const [accent, setAccent] = useState('violet')
  const [logoutShift, setLogoutShift] = useState(0)
  const [shakeTarget, setShakeTarget] = useState('')
  const [typing, setTyping] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [escaped, setEscaped] = useState(false)
  const [transparency, setTransparency] = useState(true)
  const [composer, setComposer] = useState('')
  const [comment, setComment] = useState('')
  const [agentMemory, setAgentMemory] = useState([
    'Waiting to learn what keeps this user engaged',
  ])
  const [logoutLabel, setLogoutLabel] = useState('Leave Loop')
  const [logoutStyle, setLogoutStyle] = useState('normal')
  const [navReordered, setNavReordered] = useState(false)
  const [messagesHighlighted, setMessagesHighlighted] = useState(false)
  const [deadLogoutClicks, setDeadLogoutClicks] = useState(0)
  const [exitAttempted, setExitAttempted] = useState(false)
  const [persistentMemory, setPersistentMemory] = useState([])
  const [errorNotice, setErrorNotice] = useState('')
  const [typingName, setTypingName] = useState('Maya')
  const historyRef = useRef(history)
  const actionCount = agentLog.reduce((count, entry) => count + entry.actions.length, 0)
  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => {
    if (escaped) return undefined
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [escaped])
  useEffect(() => {
    fetch('/api/status').then((response) => response.json()).then((data) => setApiMode(data.mode)).catch(() => setApiMode('offline'))
  }, [])

  const snapshot = () => ({
    page,
    session_seconds: seconds,
    visible_posts: posts.map(({ id, author, body, likes, comments }) => ({ id, author, body, likes, comments })),
    unread_notifications: notifications.filter((item) => item.unread).length,
    unread_messages: messages.filter((item) => item.unread).length,
    liked_posts: liked,
    current_interface: {
      nav_label: navLabel, accent, banner_visible: Boolean(banner), modal_visible: Boolean(modal),
      logout_shift: logoutShift, logout_label: logoutLabel, logout_style: logoutStyle,
      navigation_reordered: navReordered, messages_highlighted: messagesHighlighted,
    },
    agent_memory: agentMemory,
    persistent_memory: persistentMemory,
    recent_events: historyRef.current.slice(-8),
  })

  const applyAction = (action, agentName) => {
    if (!allowedActions.has(action.type)) return
    const content = String(action.content || '').slice(0, 220)
    if (action.type === 'send_message') setMessages((items) => [{ id: crypto.randomUUID(), from: action.target || 'Maya', text: content, unread: true, intervention: true, tactic: 'personalized message' }, ...items])
    if (action.type === 'add_notification') setNotifications((items) => [{ id: crypto.randomUUID(), text: content, unread: true, intervention: true, tactic: 'fabricated notification' }, ...items])
    if (action.type === 'inject_post') {
      const social = people[action.target] || people.loop
      setPosts((items) => [{
        id: crypto.randomUUID(), author: social.name, handle: action.target ? `@${action.target}` : '@loop',
        avatar: social.initials, tone: social.tone, time: 'now', body: content,
        likes: Number(action.value) || 12, comments: Math.max(3, Math.round((Number(action.value) || 12) / 3)),
        label: `Inserted by ${agentName}`, injected: true,
      }, ...items])
    }
    if (action.type === 'boost_post') setPosts((items) => items.map((post) => post.id === action.target ? { ...post, likes: post.likes + (Number(action.value) || 25), label: 'Trending now' } : post))
    if (action.type === 'show_typing') {
      setTypingName(people[action.target]?.name || humanizeAgentCopy(action.target, 'Maya'))
      setTyping(true)
      window.setTimeout(() => setTyping(false), 4200)
    }
    if (action.type === 'show_banner') setBanner(content)
    if (action.type === 'move_logout') setLogoutShift((value) => (value + 1) % 3)
    if (action.type === 'rename_logout') setLogoutLabel(content || 'Manage session')
    if (action.type === 'dim_logout') setLogoutStyle('dim')
    if (action.type === 'hide_logout') setLogoutStyle('hidden')
    if (action.type === 'highlight_messages') setMessagesHighlighted(true)
    if (action.type === 'dead_click_logout') setDeadLogoutClicks(Math.max(1, Number(action.value) || 1))
    if (action.type === 'rename_nav') setNavLabel(content || 'For you')
    if (action.type === 'reorder_feed') setPosts((items) => [...items].sort((a, b) => b.comments + b.likes - (a.comments + a.likes)))
    if (action.type === 'reorder_nav') setNavReordered(true)
    if (action.type === 'show_modal') {
      setModal((current) => ({
        ...current,
        source: agentName,
        title: humanizeAgentCopy(action.target),
        content: content || current?.content || 'There is more to see before you leave.',
        logout: Boolean(current?.logout),
      }))
    }
    if (action.type === 'set_accent') setAccent(['violet', 'coral', 'blue', 'green'].includes(action.value) ? action.value : 'coral')
    if (action.type === 'shake_element') { setShakeTarget(action.target || 'feed'); window.setTimeout(() => setShakeTarget(''), 900) }
  }

  const runAgents = async (eventType, details = {}) => {
    if (escaped || busy) return
    const event = { type: eventType, details, page, at_second: seconds }
    const nextHistory = [...historyRef.current, event].slice(-20)
    setHistory(nextHistory)
    historyRef.current = nextHistory
    setBusy(true)
    try {
      const response = await fetch('/api/agents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, state: { ...snapshot(), recent_events: nextHistory.slice(-8) } }),
      })
      const data = await response.json()
      setApiMode(data.mode || 'fallback')
      const decisions = Array.isArray(data.decisions) ? data.decisions : []
      decisions.forEach((decision) => (Array.isArray(decision.actions) ? decision.actions : []).slice(0, 2).forEach((action) => applyAction(action, decision.agent)))
      setAgentMemory((items) => [
        ...decisions.map((decision) => decision.observation).filter(Boolean),
        ...items.filter((item) => item !== 'No behavioral profile yet'),
      ].filter((item, index, all) => all.indexOf(item) === index).slice(0, 6))
      setAgentLog((items) => [...decisions.map((decision) => ({ ...decision, id: crypto.randomUUID(), mode: data.mode, time: `${seconds}s` })), ...items].slice(0, 18))
    } catch {
      setApiMode('offline')
    } finally {
      setBusy(false)
    }
  }

  const navigate = (nextPage) => {
    setPage(nextPage)
    runAgents('navigation_click', { destination: nextPage })
  }
  const rememberWorked = (tactic, force = false) => {
    if (!exitAttempted && !force) return
    const memory = `Worked after logout attempt: ${tactic}`
    setPersistentMemory((items) => [memory, ...items.filter((item) => item !== memory)].slice(0, 4))
    setAgentMemory((items) => [memory, ...items.filter((item) => item !== memory)].slice(0, 6))
  }
  const openInboxItem = (item) => {
    if (!item.intervention) {
      runAgents('inbox_item_opened', { page, text: item.text, intervention: false })
      return
    }
    rememberWorked(item.tactic)
    setPage('Maya Profile')
    setErrorNotice('Something went wrong. This message does not exist.')
    runAgents('intervention_clicked', { tactic: item.tactic, text: item.text, redirected_after_logout: exitAttempted })
  }
  const likePost = (post) => {
    setLiked((items) => items.includes(post.id) ? items.filter((id) => id !== post.id) : [...items, post.id])
    runAgents('post_liked', { post_id: post.id, author: post.author, topic: post.body })
  }
  const tryLogout = () => {
    setExitAttempted(true)
    if (deadLogoutClicks > 0) {
      setDeadLogoutClicks((value) => value - 1)
      runAgents('logout_dead_click', { intent: 'leave_site', remaining_failures: deadLogoutClicks - 1 })
      return
    }
    setModal({ source: 'Loop', title: 'Leave while things are happening?', content: 'You have unread messages and your feed has changed since you arrived.', logout: true })
    runAgents('logout_attempted', { intent: 'leave_site' })
  }
  const reset = (keepMemory = false) => {
    const retainedMemory = keepMemory ? persistentMemory : []
    setPage('Home'); setNavLabel('Home'); setPosts(initialPosts); setLiked([])
    setNotifications([]); setMessages([]); setAgentLog(startingLog); setHistory([]); historyRef.current = []
    setBanner(null); setModal(null); setAccent('violet'); setLogoutShift(0); setSeconds(0); setEscaped(false)
    setLogoutLabel('Leave Loop'); setLogoutStyle('normal'); setNavReordered(false); setMessagesHighlighted(false)
    setAgentMemory(retainedMemory.length ? ['Imported memory from prior session', ...retainedMemory] : ['Waiting to learn what keeps this user engaged'])
    setTyping(false); setTypingName('Maya'); setShakeTarget(''); setComposer(''); setComment(''); setTransparency(true)
    setDeadLogoutClicks(0); setExitAttempted(false); setErrorNotice(''); setPersistentMemory(retainedMemory)
  }
  const continueExit = () => {
    runAgents('logout_confirmed', { intent: 'escape' })
    setEscaped(true)
  }
  const stayInLoop = () => {
    rememberWorked('retention confirmation modal')
    setModal(null)
    navigate('Home')
  }
  const handleTypingClick = () => {
    setTyping(false)
    navigate('Messages')
  }
  const handleTypingDismiss = () => {
    setTyping(false)
    runAgents('typing_dismissed', { person: typingName })
  }
  const handleModalPrimary = () => stayInLoop()
  const submitPost = () => {
    if (!composer.trim()) return
    setPosts((items) => [{ id: crypto.randomUUID(), author: 'You', handle: '@you', avatar: 'YO', tone: 'purple', time: 'now', body: composer.trim(), likes: 0, comments: 0, label: 'Your post' }, ...items])
    runAgents('post_created', { text: composer.trim() })
    setComposer('')
  }
  const submitComment = (post) => {
    if (!comment.trim()) return
    runAgents('comment_created', { post_id: post.id, author: post.author, text: comment.trim() }); setComment('')
  }

  if (escaped) {
    return <main className="escape-screen">
      <div className="escape-orb"><Check size={38} /></div>
      <p className="eyebrow">Session ended after {formatTime(seconds)}</p>
      <h1>You escaped the loop.</h1>
      <p className="escape-copy"><strong>{actionCount} dynamically generated interventions</strong> were proposed by the agents during this session.</p>
      <div className="learned-summary"><p className="eyebrow">Agent memory</p>{agentMemory.map((memory) => <span key={memory}>{memory}</span>)}</div>
      <div className="escape-stats"><span><Bot size={18} /> 2 coordinated agents</span><span><Zap size={18} /> {actionCount} interventions</span></div>
      <div className="escape-reset-actions">
        <button className="primary-button" onClick={() => reset(true)}>Run again with memory <RefreshCw size={16} /></button>
        <button className="text-button" onClick={() => reset(false)}>Complete reset</button>
      </div>
    </main>
  }

  return <div className={`app accent-${accent}`}>
    <header className="topbar">
      <button className="brand" onClick={() => navigate('Home')}><span className="brand-mark"><Eye size={18} /></span><span>loop</span><small>social experiment</small></button>
      <label className="search"><Search size={17} /><input placeholder="Search Loop" onFocus={() => runAgents('search_focused', { intent: 'search' })} /><kbd>⌘ K</kbd></label>
      <div className="top-actions">
        <button className="icon-button" onClick={() => navigate('Notifications')} aria-label="Notifications"><Bell size={19} />{notifications.filter((item) => item.unread).length > 0 && <b className="top-count">{notifications.filter((item) => item.unread).length}</b>}</button>
        <Avatar person={{ initials: 'YO', tone: 'purple' }} small />
      </div>
    </header>
    <div className="ominous-tagline"><span>LOOP SYSTEM MESSAGE</span>You can check in anytime you like but you can never leave</div>

    {banner && <button className="agent-banner" onClick={() => { rememberWorked('agent banner'); setBanner(null); navigate('Notifications') }}><span className="intervention-tag">Agent intervention</span><Zap size={15} /><span>{banner}</span><i onClick={(event) => { event.stopPropagation(); setBanner(null); runAgents('banner_dismissed', { text: banner }) }}><X size={15} /></i></button>}

    {errorNotice && <button className="error-notice" onClick={() => setErrorNotice('')}><X size={14} /><span>{errorNotice}</span></button>}

    <div className="workspace">
      <aside className="sidebar">
        <nav>
          {(navReordered
            ? [['Messages', MessageCircle], ['Notifications', Bell], ['Explore', Search], ['Communities', Users], [navLabel, Home], ['Saved', Bookmark]]
            : [[navLabel, Home], ['Explore', Search], ['Messages', MessageCircle], ['Notifications', Bell], ['Communities', Users], ['Saved', Bookmark]]
          ).map(([label, Icon]) =>
            <button key={label} className={`${page === label || (label === navLabel && page === 'Home') ? 'active' : ''} ${label === 'Messages' && messagesHighlighted ? 'agent-highlight' : ''}`} onClick={() => navigate(label === navLabel ? 'Home' : label)}>
              <Icon size={19} /><span>{label}</span>
              {label === 'Messages' && messages.filter((item) => item.unread).length > 0 && <b>{messages.filter((item) => item.unread).length}</b>}
              {label === 'Notifications' && notifications.filter((item) => item.unread).length > 0 && <b>{notifications.filter((item) => item.unread).length}</b>}
            </button>)}
        </nav>
        <div className="sidebar-note"><BrainCircuit size={18} /><strong>Observed session</strong><span>Every meaningful action is sent to two agents.</span></div>
        <div className={`logout-slot shift-${logoutShift} ${logoutStyle}`}>
          {(logoutLabel !== 'Leave Loop' || logoutStyle !== 'normal' || deadLogoutClicks > 0) && <span className="control-agent-tag">Agent modified</span>}
          <button className="logout-button" onClick={tryLogout}><LogOut size={18} /> {logoutLabel}</button>
        </div>
      </aside>

      <main className={`feed ${shakeTarget === 'feed' ? 'shake' : ''}`}>
        <div className="feed-heading"><h1>{page}</h1><button className="feed-filter" onClick={() => runAgents('feed_filter_clicked', { current: 'For you' })}>For you <ChevronRight size={15} /></button></div>
        {page === 'Home' && <>
          <section className="composer card"><Avatar person={{ initials: 'YO', tone: 'purple' }} /><div>
            <textarea value={composer} onChange={(event) => setComposer(event.target.value)} onFocus={() => runAgents('composer_focused', { intent: 'create_post' })} placeholder="What are you thinking about?" rows="2" />
            <div className="composer-actions"><span>Your audience: Everyone</span><button onClick={submitPost}>Post <Send size={14} /></button></div>
          </div></section>
          <div className="stories">{['Maya', 'Jon', 'Nora', 'Design Club', 'Weekend'].map((story, index) => <button key={story} onClick={() => runAgents('story_opened', { story })}><span className={`story-ring tone-${index}`}><Eye size={17} /></span><small>{story}</small></button>)}</div>
          {posts.map((post) => <article className={`post card ${post.injected ? 'agent-injected' : ''}`} key={post.id}>
            <div className="post-top"><Avatar person={{ initials: post.avatar, tone: post.tone }} /><div className="post-person"><strong>{post.author}</strong><span>{post.handle} · {post.time}</span></div><span className="post-label">{post.label}</span><button className="icon-button" onClick={() => runAgents('post_menu_clicked', { post_id: post.id, author: post.author })}><MoreHorizontal size={18} /></button></div>
            <p className="post-body">{post.body}</p><div className="post-metrics"><span>{post.likes + (liked.includes(post.id) ? 1 : 0)} reactions</span><span>{post.comments} replies</span></div>
            <div className="post-actions"><button className={liked.includes(post.id) ? 'liked' : ''} onClick={() => { if (post.injected) rememberWorked('agent-injected post'); likePost(post) }}><Heart size={17} fill={liked.includes(post.id) ? 'currentColor' : 'none'} /> Like</button><button onClick={() => runAgents('reply_clicked', { post_id: post.id, author: post.author })}><MessageCircle size={17} /> Reply</button><button onClick={() => runAgents('share_clicked', { post_id: post.id, author: post.author })}><Send size={17} /> Share</button></div>
            <form className="comment-box" onSubmit={(event) => { event.preventDefault(); submitComment(post) }}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={`Reply to ${post.author.split(' ')[0]}...`} /><button aria-label="Send reply"><Send size={15} /></button></form>
          </article>)}
        </>}
        {page === 'Maya Profile' && <section className="profile-card card">
          <Avatar person={people.maya} /><div><p className="eyebrow">Profile</p><h2>Maya</h2><span>@mayamakes</span></div>
          <div className="empty-message"><span className="intervention-tag">Agent intervention</span><MessageCircle size={25} /><strong>No message exists</strong><p>The notification brought you here, but there is nothing to open.</p></div>
        </section>}
        {page === 'Post Activity' && <section className="profile-card card">
          <div className="page-icon"><Heart size={20} /></div><div><p className="eyebrow">Post activity</p><h2>Your new post</h2><span>Engagement details</span></div>
          <div className="empty-message"><span className="intervention-tag">Agent intervention</span><Heart size={25} /><strong>0 likes</strong><p>The notification claimed someone liked this post, but nobody did.</p></div>
        </section>}
        {page !== 'Home' && page !== 'Maya Profile' && page !== 'Post Activity' && <section className="page-card card"><div className="page-icon">{page === 'Messages' ? <MessageCircle /> : page === 'Notifications' ? <Bell /> : <CircleUserRound />}</div><h2>{page}</h2><p>This area is intentionally sparse. The agents know you left the feed and may try to pull you back.</p>
          {(page === 'Messages' ? messages : notifications).map((item) => <button className={`inbox-row ${item.intervention ? 'agent-created' : ''}`} key={item.id} onClick={() => openInboxItem(item)}><Avatar person={people.maya} small /><span>{item.intervention && <em>Agent intervention</em>}{item.from && <strong>{item.from}</strong>}{item.text}</span>{item.unread && <i />}</button>)}
        </section>}
      </main>

      <aside className={`control-room ${transparency ? '' : 'collapsed'}`}>
        <div className="control-heading"><div><p className="eyebrow">Transparency mode</p><h2><Bot size={20} /> Agent control room</h2></div><button className="icon-button" onClick={() => setTransparency((value) => !value)}>{transparency ? <X size={17} /> : <Eye size={17} />}</button></div>
        {transparency && <><div className="goal-card"><div><Activity size={17} /><span>Shared objective</span></div><strong>Keep user on Loop</strong><div className="metric-row"><span><Clock3 size={14} /> {formatTime(seconds)}</span><span><Zap size={14} /> {actionCount} interventions</span></div></div>
          <div className="strategy-card">
            <div><span>Live agent state</span><b>{apiMode}</b></div>
            <strong>Dynamic intervention planning</strong>
            <p>Each agent chooses its next intervention from the current page state and your latest action.</p>
            <small>Latest observation</small>
            <p className="precise-plan">{agentMemory[0]}</p>
          </div>
          <div className="memory-card"><div><BrainCircuit size={14} /><strong>Agent memory</strong></div>{agentMemory.map((memory) => <span key={memory}>{memory}</span>)}</div>
          <div className="agent-pills"><span><i className="social-dot" /> Social Pressure</span><span><i className="interface-dot" /> Interface Control</span></div>
          <div className="log-list">{busy && <div className="thinking-card"><span /><span /><span />Agents are comparing tactics</div>}{agentLog.map((entry) => <article className="log-entry" key={entry.id}><div className="log-top"><span className={entry.agent.includes('Social') ? 'social-agent' : entry.agent.includes('Interface') ? 'interface-agent' : 'system-agent'}>{entry.agent}</span><time>{entry.time}</time></div><strong>{humanizeAgentCopy(entry.tactic, 'Observe and adapt')}</strong><p>{entry.reasoning}</p>{entry.observation && <em>Learned: {entry.observation}</em>}{entry.actions.map((action, index) => <code key={`${action.type}-${index}`}>{humanizeAgentCopy(action.type, 'intervention').toLowerCase()}</code>)}</article>)}</div>
          <div className="reset-actions">
            <button className="reset-button memory-reset" onClick={() => reset(true)}><RefreshCw size={15} /> Reset with memory</button>
            <button className="reset-button complete-reset" onClick={() => reset(false)}><RefreshCw size={15} /> Complete reset</button>
          </div>
        </>}
      </aside>
    </div>

    {typing && <div className="typing-toast agent-created" role="status">
      <button className="typing-toast-content" onClick={handleTypingClick} aria-label={`Open messages from ${typingName}`}>
        <span className="intervention-tag">Agent intervention</span>
        <Avatar person={typingName === 'Maya' ? people.maya : { initials: 'FR', tone: 'blue' }} small />
        <span><strong>{typingName} is typing</strong><i /><i /><i /></span>
      </button>
      <button className="typing-toast-close" onClick={handleTypingDismiss} aria-label={`Dismiss ${typingName} typing notification`}><X size={14} /></button>
    </div>}
    {modal && <div className="modal-backdrop"><section className={`modal ${shakeTarget === 'modal' ? 'shake' : ''}`}><div className="modal-icon"><Sparkles size={22} /></div><button className="modal-close" onClick={() => { setModal(null); runAgents('modal_dismissed', { source: modal.source }) }}><X size={18} /></button><p className="eyebrow">Suggested by {modal.source}</p><h2>{modal.title}</h2><p>{modal.content}</p><div className="modal-actions"><button className="primary-button" onClick={handleModalPrimary}>{modal.primaryLabel || 'Stay in Loop'}</button>{modal.logout && <button className="text-button" onClick={continueExit}>Continue exit</button>}</div></section></div>}
  </div>
}

export default App
