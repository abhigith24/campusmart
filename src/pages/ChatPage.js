import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, query, orderBy, onSnapshot, addDoc,
  serverTimestamp, doc, updateDoc, where, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function ChatPage({ initialChatWith, setPage }) {
  const { currentUser, userProfile } = useAuth();
  const [chats,          setChats]          = useState([]);
  const [activeChat,     setActiveChat]     = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [sending,        setSending]        = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const unsubMsgRef = useRef(null);

  // ── Load sidebar chats (realtime) ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("lastMessageTime", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChats(list);

      // Auto-select active chat if it updated (keeps messages in sync)
      setActiveChat(prev => {
        if (!prev) return prev;
        const updated = list.find(c => c.id === prev.id);
        return updated ? { ...prev, ...updated } : prev;
      });
    }, err => console.error("Chats listener error:", err));
    return unsub;
  }, [currentUser]);

  // ── Open chat from listing detail ──────────────────────────────────────────
  useEffect(() => {
    if (!initialChatWith?.chatId) return;
    // Fetch fresh chat doc then activate
    getDoc(doc(db, "chats", initialChatWith.chatId)).then(snap => {
      if (snap.exists()) {
        setActiveChat({ id: snap.id, ...snap.data() });
      } else {
        setActiveChat({ id: initialChatWith.chatId, ...initialChatWith });
      }
      setMobileChatOpen(true);
    }).catch(() => {
      setActiveChat({ id: initialChatWith.chatId, ...initialChatWith });
      setMobileChatOpen(true);
    });
  }, [initialChatWith]);

  // ── Load messages for active chat (realtime) ───────────────────────────────
  useEffect(() => {
    // Clean up previous listener
    if (unsubMsgRef.current) { unsubMsgRef.current(); unsubMsgRef.current = null; }
    if (!activeChat?.id) { setMessages([]); return; }

    const q = query(
      collection(db, "chats", activeChat.id, "messages"),
      orderBy("createdAt", "asc")
    );
    unsubMsgRef.current = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }, err => console.error("Messages listener error:", err.code, err.message));

    return () => { if (unsubMsgRef.current) unsubMsgRef.current(); };
  }, [activeChat?.id]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeChat || sending) return;
    setSending(true);
    setInput("");
    try {
      const senderName = userProfile?.name || currentUser.displayName || "Student";
      // Add to messages subcollection
      await addDoc(collection(db, "chats", activeChat.id, "messages"), {
        text,
        senderId:   currentUser.uid,
        senderName,
        createdAt:  serverTimestamp()
      });
      // Update chat meta so both users see latest message in sidebar
      await updateDoc(doc(db, "chats", activeChat.id), {
        lastMessage:     text,
        lastMessageTime: serverTimestamp(),
        // Mark as unread for the OTHER participant
        [`unread_${activeChat.participants?.find(id => id !== currentUser.uid)}`]: true
      });
    } catch (err) {
      console.error("Send error:", err.code, err.message);
    }
    setSending(false);
    inputRef.current?.focus();
  }, [input, activeChat, sending, currentUser, userProfile]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function getOtherName(chat) {
    if (!chat?.participantNames) return "User";
    const otherId = chat.participants?.find(id => id !== currentUser.uid);
    return chat.participantNames?.[otherId] || "User";
  }

  function getInitial(chat) {
    return (getOtherName(chat)[0] || "U").toUpperCase();
  }

  function formatTime(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000)    return "Just now";
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function hasUnread(chat) {
    return chat[`unread_${currentUser.uid}`] === true;
  }

  async function openChat(chat) {
    setActiveChat(chat);
    setMobileChatOpen(true);
    // Mark as read
    const unreadKey = `unread_${currentUser.uid}`;
    if (chat[unreadKey]) {
      updateDoc(doc(db, "chats", chat.id), { [unreadKey]: false }).catch(() => {});
    }
  }

  return (
    <div className="chat-page">
      {/* ── Sidebar ── */}
      <div className={`chat-sidebar ${mobileChatOpen ? "sidebar-hidden" : ""}`}>
        <div className="chat-sidebar-header">
          <button className="chat-back-home" onClick={() => setPage("home")} title="Back">
            ←
          </button>
          <span>Messages</span>
        </div>

        {chats.length === 0 ? (
          <div className="chat-empty-sidebar">
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontWeight: 800, marginTop: 10 }}>No chats yet</div>
            <div style={{ fontSize: 13, marginTop: 4, color: "var(--muted)" }}>
              Contact a seller to start
            </div>
          </div>
        ) : chats.map(chat => (
          <div
            key={chat.id}
            className={`chat-item ${activeChat?.id === chat.id ? "active" : ""} ${hasUnread(chat) ? "has-unread" : ""}`}
            onClick={() => openChat(chat)}
          >
            <div className="chat-item-avatar">{getInitial(chat)}</div>
            <div className="chat-item-info">
              <div className="chat-item-name">
                {getOtherName(chat)}
                {hasUnread(chat) && <span className="unread-badge" />}
              </div>
              <div className="chat-item-listing">{chat.listingTitle || "Item"}</div>
              <div className="chat-item-preview">{chat.lastMessage || "No messages yet"}</div>
            </div>
            <div className="chat-item-time">{formatTime(chat.lastMessageTime)}</div>
          </div>
        ))}
      </div>

      {/* ── Main Chat ── */}
      <div className={`chat-main ${mobileChatOpen ? "chat-main-visible" : ""}`}>
        {!activeChat ? (
          <div className="chat-empty">
            <div style={{ fontSize: 56 }}>💬</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginTop: 12 }}>Your Messages</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 6, textAlign: "center", maxWidth: 260 }}>
              Select a conversation or contact a seller from a listing
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="chat-header">
              <button
                className="chat-back-btn"
                onClick={() => { setMobileChatOpen(false); setActiveChat(null); }}
              >←</button>
              <div className="chat-header-avatar">{getInitial(activeChat)}</div>
              <div className="chat-header-info">
                <div className="chat-header-name">{getOtherName(activeChat)}</div>
                {activeChat.listingTitle && (
                  <div className="chat-header-listing">re: {activeChat.listingTitle}</div>
                )}
              </div>
              <div className="chat-online-dot" title="Online" />
            </div>

            {/* Listing context pill */}
            {activeChat.listingTitle && (
              <div className="chat-listing-bar">
                🛒 <strong>{activeChat.listingTitle}</strong>
              </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-start-hint">
                  👋 Say hi! Ask about the item, condition, meetup location, etc.
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.senderId === currentUser.uid;
                const showName = !isMine && (i === 0 || messages[i-1]?.senderId !== msg.senderId);
                return (
                  <div key={msg.id} className={`msg-row ${isMine ? "mine" : "theirs"}`}>
                    {showName && (
                      <div className="msg-sender-name">{msg.senderName}</div>
                    )}
                    <div className={`msg-bubble ${isMine ? "msg-mine" : "msg-theirs"}`}>
                      {msg.text}
                    </div>
                    <div className="msg-time">{formatTime(msg.createdAt)}</div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
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
              <button
                className={`chat-send-btn ${input.trim() ? "active" : ""}`}
                onClick={sendMessage}
                disabled={!input.trim() || sending}
              >
                {sending ? "..." : "↑"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
