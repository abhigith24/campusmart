import React, { useState, useEffect, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc, where
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function ChatPage({ initialChatWith, setPage }) {
  const { currentUser, userProfile } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load user's chats
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageTime", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [currentUser]);

  // Set initial chat if coming from listing detail
  useEffect(() => {
    if (initialChatWith) {
      setActiveChat({ id: initialChatWith.chatId, ...initialChatWith });
      setMobileChatOpen(true);
    }
  }, [initialChatWith]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) return;
    const chatId = activeChat.id;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !activeChat) return;
    setInput("");
    const myName = userProfile?.name || currentUser.displayName;
    await addDoc(collection(db, "chats", activeChat.id, "messages"), {
      text,
      senderId: currentUser.uid,
      senderName: myName,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "chats", activeChat.id), {
      lastMessage: text,
      lastMessageTime: serverTimestamp()
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function getOtherName(chat) {
    if (!chat.participantNames) return "User";
    const otherId = chat.participants?.find(id => id !== currentUser.uid);
    return chat.participantNames[otherId] || "User";
  }

  function formatTime(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage("home")}
            style={{ marginRight: 8, padding: "4px 8px" }}
            title="Back to home"
          >
            ←
          </button>
          💬 Messages
        </div>
        {chats.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
            <div style={{ fontWeight: 700 }}>No conversations yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Contact a seller to start chatting!</div>
          </div>
        ) : (
          chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat?.id === chat.id ? "active" : ""}`}
              onClick={() => { setActiveChat(chat); setMobileChatOpen(true); }}
            >
              <div className="avatar" style={{ flexShrink: 0 }}>
                {getOtherName(chat)[0]?.toUpperCase()}
              </div>
              <div className="chat-item-info">
                <div className="chat-item-name">{getOtherName(chat)}</div>
                <div className="chat-item-preview">{chat.listingTitle || "Item"}</div>
                <div className="chat-item-preview">{chat.lastMessage || "No messages yet"}</div>
              </div>
              <div>
                <div className="chat-item-time">{formatTime(chat.lastMessageTime)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main chat */}
      <div className={`chat-main ${mobileChatOpen ? "visible" : ""}`}>
        {!activeChat ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">👋</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Select a conversation</div>
            <div style={{ fontSize: 14 }}>Choose a chat from the left to get started</div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <button
                className="btn btn-ghost btn-sm chat-back-btn"
                onClick={() => {
                  if (mobileChatOpen) {
                    setMobileChatOpen(false);
                  } else {
                    setPage("home");
                  }
                }}
                title="Go back"
              >
                ← Back
              </button>
              <div className="avatar">{getOtherName(activeChat)[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>{getOtherName(activeChat)}</div>
                {activeChat.listingTitle && (
                  <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    About: {activeChat.listingTitle}
                  </div>
                )}
              </div>
            </div>
            {/* Listing context bar */}
            {activeChat.listingTitle && (
              <div style={{
                padding: "8px 20px", background: "var(--primary-light)",
                borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10, fontSize: 13
              }}>
                <span style={{ fontWeight: 800 }}>🛒</span>
                <span style={{ flex: 1 }}>
                  Discussing: <strong>{activeChat.listingTitle}</strong>
                </span>
              </div>
            )}

            <div className="chat-messages">
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 14, marginTop: 40 }}>
                  Start the conversation! Ask about the item, negotiation, pickup, etc.
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`msg ${msg.senderId === currentUser.uid ? "mine" : "theirs"}`}>
                  <div className="msg-bubble">{msg.text}</div>
                  <div className="msg-time">{formatTime(msg.createdAt)}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="chat-input-bar">
              <textarea
                ref={inputRef}
                className="chat-input"
                rows={1}
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn btn-primary" onClick={sendMessage} disabled={!input.trim()}>
                Send →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
