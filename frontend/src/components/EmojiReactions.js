import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMOJI_CATEGORIES = {
  love: ["<3", "two-hearts", "sparkling-heart", "growing-heart", "heart-eyes", "smiling-face-with-hearts", "kissing-face", "kiss-mark", "heart-with-ribbon", "heart-with-arrow"],
  faces: ["smiling", "joy", "rolling", "crying", "pleading", "shocked", "exploding", "see-no-evil", "hugging", "sleeping"],
  animals: ["cat", "dog", "rabbit", "fox", "bear", "panda", "koala", "butterfly", "octopus", "penguin"],
  food: ["popcorn", "pizza", "burger", "donut", "ice-cream", "cupcake", "chocolate", "bubbles", "coffee", "beverage"],
};

const EMOJIS = {
  love: ["\u2764\uFE0F", "\uD83D\uDC95", "\uD83D\uDC96", "\uD83D\uDC97", "\uD83D\uDE0D", "\uD83E\uDD70", "\uD83D\uDE18", "\uD83D\uDC8B", "\uD83D\uDC9D", "\uD83D\uDC98"],
  faces: ["\uD83D\uDE0A", "\uD83D\uDE02", "\uD83E\uDD23", "\uD83D\uDE2D", "\uD83E\uDD7A", "\uD83D\uDE31", "\uD83E\uDD2F", "\uD83D\uDE48", "\uD83E\uDD17", "\uD83D\uDE34"],
  animals: ["\uD83D\uDC31", "\uD83D\uDC36", "\uD83D\uDC30", "\uD83E\uDD8A", "\uD83D\uDC3B", "\uD83D\uDC3C", "\uD83D\uDC28", "\uD83E\uDD8B", "\uD83D\uDC19", "\uD83D\uDC27"],
  food: ["\uD83C\uDF7F", "\uD83C\uDF55", "\uD83C\uDF54", "\uD83C\uDF69", "\uD83C\uDF66", "\uD83E\uDDC1", "\uD83C\uDF6B", "\uD83E\uDEE7", "\u2615", "\uD83E\uDD64"],
};

const STICKERS = [
  "\uD83D\uDC31", "\uD83D\uDC36", "\uD83D\uDC30", "\uD83E\uDD8A", "\uD83D\uDC3B", "\uD83D\uDC3C",
  "\uD83D\uDC27", "\uD83E\uDD84", "\uD83C\uDF08", "\u2B50",
  "\uD83C\uDF19", "\u2601\uFE0F", "\uD83C\uDF3A", "\uD83C\uDF38",
  "\uD83C\uDFAC", "\uD83C\uDF7F", "\u2764\uFE0F\u200D\uD83D\uDD25", "\uD83D\uDC95",
];

const QUICK_REACTIONS = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE0D", "\uD83D\uDE22", "\uD83D\uDC4D", "\uD83D\uDD25"];

export function QuickReactions({ onReact }) {
  return (
    <div className="flex gap-1">
      {QUICK_REACTIONS.map((emoji, i) => (
        <button
          key={i}
          data-testid={`quick-reaction-${i}`}
          onClick={() => onReact(emoji)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-base"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export default function EmojiReactions({ onSelect, onStickerSelect, isDark = false }) {
  const [tab, setTab] = useState("love");

  const bgClass = isDark ? "bg-slate-800/90 border-white/10" : "bg-white/90 border-slate-200";
  const tabBg = isDark ? "bg-white/10" : "bg-slate-100";

  return (
    <div
      data-testid="emoji-picker"
      className={`${bgClass} backdrop-blur-xl rounded-2xl border shadow-lg p-3 w-72`}
    >
      <Tabs defaultValue="emojis">
        <TabsList className={`w-full ${tabBg} rounded-xl mb-2`}>
          <TabsTrigger value="emojis" className="rounded-lg flex-1 text-xs font-semibold">
            Emojis
          </TabsTrigger>
          <TabsTrigger value="stickers" className="rounded-lg flex-1 text-xs font-semibold">
            Stickers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emojis" className="mt-0">
          <div className="flex gap-1 mb-2 overflow-x-auto">
            {Object.keys(EMOJIS).map((cat) => (
              <button
                key={cat}
                data-testid={`emoji-category-${cat}`}
                onClick={() => setTab(cat)}
                className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                  tab === cat
                    ? "bg-[#1E1B4B] text-white"
                    : isDark
                    ? "text-slate-300 hover:bg-white/10"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {EMOJIS[tab]?.map((emoji, i) => (
              <button
                key={i}
                data-testid={`emoji-${tab}-${i}`}
                onClick={() => onSelect(emoji)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-purple-100/50 transition-colors text-xl"
              >
                {emoji}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stickers" className="mt-0">
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((sticker, i) => (
              <button
                key={i}
                data-testid={`sticker-${i}`}
                onClick={() => onStickerSelect(sticker)}
                className="w-14 h-14 flex items-center justify-center rounded-2xl hover:bg-purple-100/50 transition-all hover:scale-110 text-3xl"
              >
                {sticker}
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
