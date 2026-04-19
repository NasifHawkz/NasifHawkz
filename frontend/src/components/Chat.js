import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Smile, X } from "lucide-react";
import EmojiReactions, { QuickReactions } from "@/components/EmojiReactions";

export default function Chat({ messages, onSend, onReaction, userId, isDark = false }) {
  const [text, setText] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), "text");
    setText("");
    setShowEmojis(false);
  };

  const handleEmojiSelect = (emoji) => {
    setText((prev) => prev + emoji);
  };

  const handleStickerSend = (sticker) => {
    onSend(sticker, "sticker");
    setShowEmojis(false);
  };

  const textColor = isDark ? "text-slate-200" : "text-slate-800";
  const mutedColor = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark
    ? "bg-white/10 border-white/10 text-white placeholder:text-slate-400"
    : "bg-white/50 border-slate-200 text-slate-800";

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <div className={`text-center py-12 ${mutedColor}`}>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Say something sweet!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isSelf = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              data-testid={`chat-message-${msg.id}`}
              className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
              onMouseEnter={() => setHoveredMsg(msg.id)}
              onMouseLeave={() => setHoveredMsg(null)}
            >
              <div className="max-w-[80%] relative group">
                {msg.message_type === "sticker" ? (
                  <div className="text-5xl p-2">{msg.content}</div>
                ) : (
                  <div className={`px-4 py-2.5 ${isSelf ? "bubble-self" : "bubble-partner"}`}>
                    {!isSelf && (
                      <p className={`text-[10px] font-bold mb-0.5 ${isDark ? "text-purple-300" : "text-purple-500"}`}>
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                  </div>
                )}
                {/* Reactions */}
                {msg.reactions?.length > 0 && (
                  <div className={`flex gap-0.5 mt-1 ${isSelf ? "justify-end" : "justify-start"}`}>
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="text-xs bg-white/20 rounded-full px-1.5 py-0.5">
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}
                {/* Quick react on hover */}
                {hoveredMsg === msg.id && onReaction && (
                  <div
                    className={`absolute -top-8 ${isSelf ? "right-0" : "left-0"} ${
                      isDark ? "bg-slate-700" : "bg-white"
                    } rounded-full shadow-lg px-1 py-0.5 flex gap-0.5 z-10`}
                  >
                    <QuickReactions onReact={(emoji) => onReaction(msg.id, emoji)} />
                  </div>
                )}
                <p className={`text-[10px] mt-1 ${isSelf ? "text-right" : "text-left"} ${mutedColor}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="absolute bottom-20 left-2 z-20">
          <EmojiReactions
            onSelect={handleEmojiSelect}
            onStickerSelect={handleStickerSend}
            isDark={isDark}
          />
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            data-testid="emoji-toggle-button"
            onClick={() => setShowEmojis(!showEmojis)}
            className={`p-2 rounded-full transition-colors ${
              showEmojis
                ? "bg-purple-500/20 text-purple-400"
                : isDark
                ? "text-slate-400 hover:text-white hover:bg-white/10"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            {showEmojis ? <X className="w-5 h-5" /> : <Smile className="w-5 h-5" />}
          </button>
          <Input
            data-testid="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className={`flex-1 rounded-full h-10 text-sm ${inputBg}`}
          />
          <Button
            data-testid="chat-send-button"
            onClick={handleSend}
            disabled={!text.trim()}
            size="icon"
            className="rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white h-10 w-10 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
