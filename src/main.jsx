import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { sendChat, listConversations, getMessages, deleteConversation } from "./api.js";
import "./style.css";

const MODES = [
  { id: "tutor", label: "Tutor" },
  { id: "summary", label: "Summarize" },
  { id: "quiz", label: "Quiz" },
  { id: "flashcards", label: "Flashcards" }
];

const DEFAULT_HINT = "Ask anything about your studies...";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("tutor");
  const [hint, setHint] = useState(DEFAULT_HINT);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [savedChats, setSavedChats] = useState([]);
  const inputRef = useRef(null);

  const suggestions = [
    { icon: "📚", title: "Summarize notes", desc: "Turn long notes into clear summaries", mode: "summary", hint: "Paste your notes here to summarize..." },
    { icon: "🧠", title: "Explain a concept", desc: "Understand difficult topics simply", mode: "tutor", hint: "Which concept should I explain? e.g. photosynthesis" },
    { icon: "✍️", title: "Generate a quiz", desc: "Test your knowledge with questions", mode: "quiz", hint: "Enter a topic for your quiz, e.g. World War 2" },
    { icon: "📄", title: "Study documents", desc: "Prepare to learn from your PDFs", mode: "summary", hint: "PDF upload is coming soon. Paste text here for now." }
  ];

  async function refreshHistory() {
    try {
      setSavedChats(await listConversations());
    } catch {
      /* backend offline */
    }
  }

  useEffect(() => {
    refreshHistory();
  }, []);

  function pickSuggestion(item) {
    setMode(item.mode);
    setHint(item.hint);
    inputRef.current?.focus();
  }

  function newConversation() {
    setMessages([]);
    setConversationId(null);
    setMode("tutor");
    setHint(DEFAULT_HINT);
    setMessage("");
  }

  async function openConversation(chat) {
    try {
      const saved = await getMessages(chat.id);
      setMessages(saved.map((m) => ({ role: m.role, text: m.content })));
      setConversationId(chat.id);
      setMode(chat.mode);
      setHint(DEFAULT_HINT);
    } catch {
      alert("Could not load this chat.");
    }
  }

  async function removeConversation(id) {
    try {
      await deleteConversation(id);
      if (id === conversationId) newConversation();
      refreshHistory();
    } catch {
      alert("Could not delete this chat.");
    }
  }

  async function sendMessage() {
    const question = message.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setMessage("");
    setLoading(true);

    try {
      const data = await sendChat(conversationId, mode, question);
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
      refreshHistory();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't reach the AI server. Make sure the backend is running and try again." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span>✦</span> StudyMate</div>
        <button className="new-chat" onClick={newConversation}>
          + New conversation
        </button>
        <p className="side-label">YOUR LEARNING SPACE</p>
        <div className="nav-item active">⌂ &nbsp; AI Study Assistant</div>
        <div className="nav-item">▤ &nbsp; My Documents</div>
        <div className="nav-item">▦ &nbsp; My Quizzes</div>

        <p className="side-label">STUDY HISTORY</p>
        <div className="history-list">
          {savedChats.length === 0 && <div className="history-empty">No saved chats yet</div>}
          {savedChats.map((chat) => (
            <div
              key={chat.id}
              className={`history-item ${chat.id === conversationId ? "active" : ""}`}
              onClick={() => openConversation(chat)}
            >
              <span>{chat.title}</span>
              <button
                className="history-del"
                aria-label="Delete chat"
                onClick={(e) => {
                  e.stopPropagation();
                  removeConversation(chat.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="avatar">S</div>
          <div><strong>Student Workspace</strong><small>Keep learning, keep growing.</small></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span>AI LEARNING ASSISTANT</span>
          <span className="status"><i /> Ready to learn</span>
        </header>

        <section className="content">
          <div className="hero-icon">✦</div>
          <p className="eyebrow">YOUR PERSONAL AI STUDY PARTNER</p>
          <h1>Learn smarter.<br /><span>Go further.</span></h1>
          <p className="subtitle">
            Your learning journey starts here. Ask questions, explore ideas,
            and make every study session count.
          </p>

          {messages.length === 0 ? (
            <>
              <div className="section-title">WHAT WOULD YOU LIKE TO DO?</div>
              <div className="cards">
                {suggestions.map((item) => (
                  <button className="action-card" key={item.title} onClick={() => pickSuggestion(item)}>
                    <span className="card-icon">{item.icon}</span>
                    <strong>{item.title}</strong>
                    <small>{item.desc}</small>
                    <span className="arrow">↗</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="chat">
              {messages.map((item, index) => (
                <div className={`message ${item.role}`} key={index}>
                  <strong>{item.role === "user" ? "You" : "StudyMate AI"}</strong>
                  <p>{item.text}</p>
                </div>
              ))}
              {loading && (
                <div className="message assistant">
                  <strong>StudyMate AI</strong>
                  <p>Thinking...</p>
                </div>
              )}
            </div>
          )}

          <div className="mode-row">
            {MODES.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`mode-chip ${mode === m.id ? "active" : ""}`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={hint}
              aria-label="Your study question"
            />
            <button type="submit" aria-label="Send message" disabled={loading}>↑</button>
          </form>
          <p className="disclaimer">Your AI study partner · Chats are saved to your history</p>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);