import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Monitor,
  Video,
  MessageCircle,
  Copy,
  Check,
  LogOut,
  Plus,
  Trash2,
  Heart,
  Link2,
  Film,
  Users,
  CircleDot,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [pairCode, setPairCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchPartner = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/partner/info`, { withCredentials: true });
      setPartnerInfo(data);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchWatchlist = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/watchlist`, { withCredentials: true });
      setWatchlist(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchPartner();
    fetchWatchlist();
  }, [fetchPartner, fetchWatchlist]);

  const copyCode = () => {
    navigator.clipboard.writeText(user?.pairing_code || "");
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePair = async () => {
    if (!pairCode.trim()) return;
    try {
      const { data } = await axios.post(`${API}/partner/pair`, { pairing_code: pairCode }, { withCredentials: true });
      toast.success(`Paired with ${data.partner_name}!`);
      setPairCode("");
      await refreshUser();
      await fetchPartner();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to pair");
    }
  };

  const addToWatchlist = async () => {
    if (!newTitle.trim()) return;
    try {
      await axios.post(`${API}/watchlist`, { title: newTitle, platform: "Netflix" }, { withCredentials: true });
      setNewTitle("");
      setShowAddDialog(false);
      toast.success("Added to watchlist!");
      fetchWatchlist();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
    }
  };

  const deleteFromWatchlist = async (id) => {
    try {
      await axios.delete(`${API}/watchlist/${id}`, { withCredentials: true });
      fetchWatchlist();
    } catch {
      /* ignore */
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API}/watchlist/${id}`, { status }, { withCredentials: true });
      fetchWatchlist();
    } catch {
      /* ignore */
    }
  };

  const isPaired = partnerInfo?.paired;

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E1B4B] flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-base md:text-lg font-bold text-slate-900">DuoWatch</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 hidden sm:block">Hey, {user?.name}</span>
            <Button
              data-testid="logout-button"
              variant="ghost"
              size="sm"
              onClick={logout}
              className="rounded-full text-slate-600 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-6">
          {/* Welcome Card */}
          <div className="md:col-span-5 lg:col-span-8 glass-card rounded-3xl p-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <img
                src="https://images.unsplash.com/photo-1758522490530-7025eaa5009c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwyfHxoYXBweSUyMGNvdXBsZSUyMGxhcHRvcCUyMGJlZHxlbnwwfHx8fDE3NzY1ODI5OTN8MA&ixlib=rb-4.1.0&q=85"
                alt="Couple watching"
                className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
              />
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800 mb-2">
                  Welcome back, {user?.name}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {isPaired
                    ? `Paired with ${partnerInfo.partner_name}. Ready for movie night?`
                    : "Pair with your partner to start watching together!"}
                </p>
              </div>
            </div>
          </div>

          {/* Partner Status Card */}
          <div className="md:col-span-3 lg:col-span-4 glass-card rounded-3xl p-6 animate-fade-in-up stagger-1">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Partner</span>
            </div>
            {isPaired ? (
              <div>
                <p className="text-base font-semibold text-slate-800 mb-2">{partnerInfo.partner_name}</p>
                  <Badge
                  data-testid="partner-status-badge"
                  className={`rounded-full text-xs ${
                    partnerInfo.is_online
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <CircleDot className="w-3 h-3 mr-1" />
                  {partnerInfo.is_online ? "Online" : "Offline"}
                </Badge>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Your code</p>
                  <div className="flex items-center gap-2">
                    <code
                      data-testid="pairing-code-display"
                      className="text-lg font-bold text-[#1E1B4B] tracking-wider"
                    >
                      {user?.pairing_code}
                    </code>
                    <button
                      data-testid="copy-pairing-code"
                      onClick={copyCode}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    data-testid="pair-code-input"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    placeholder="Partner's code"
                    className="rounded-xl bg-white/50 border-slate-200 h-10 text-sm"
                  />
                  <Button
                    data-testid="pair-button"
                    onClick={handlePair}
                    size="sm"
                    className="rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white px-4 h-10"
                  >
                    <Link2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Watch Together Card */}
          <div className="md:col-span-4 lg:col-span-6 glass-card rounded-3xl p-6 animate-fade-in-up stagger-2">
            <div
              className="relative rounded-2xl overflow-hidden h-48 mb-4 cursor-pointer group"
              onClick={() => isPaired && navigate("/watch")}
              style={{
                backgroundImage: `url(https://images.pexels.com/photos/21832930/pexels-photo-21832930.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-[#1E1B4B]/60 group-hover:bg-[#1E1B4B]/50 transition-colors flex items-center justify-center">
                <div className="text-center text-white">
                  <Monitor className="w-10 h-10 mx-auto mb-2" />
                  <p className="font-bold text-lg">Start Watch Party</p>
                  <p className="text-sm text-white/70">Share your screen & watch together</p>
                </div>
              </div>
            </div>
            <Button
              data-testid="start-watch-party-button"
              onClick={() => navigate("/watch")}
              disabled={!isPaired}
              className="w-full rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white h-11 font-semibold btn-lift"
            >
              <Monitor className="w-4 h-4 mr-2" />
              {isPaired ? "Open Watch Room" : "Pair first to watch"}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-4 lg:col-span-6 grid grid-cols-2 gap-4 animate-fade-in-up stagger-3">
            <button
              data-testid="video-call-button"
              onClick={() => isPaired && navigate("/watch?mode=video")}
              disabled={!isPaired}
              className="glass-card rounded-3xl p-6 text-left hover:shadow-lg transition-all btn-lift disabled:opacity-50"
            >
              <Video className="w-8 h-8 text-[#D8B4E2] mb-3" />
              <p className="font-semibold text-slate-800 text-sm">Video Call</p>
              <p className="text-xs text-slate-500 mt-1">Face-to-face</p>
            </button>
            <button
              data-testid="chat-button"
              onClick={() => isPaired && navigate("/watch?mode=chat")}
              disabled={!isPaired}
              className="glass-card rounded-3xl p-6 text-left hover:shadow-lg transition-all btn-lift disabled:opacity-50"
            >
              <MessageCircle className="w-8 h-8 text-[#BDE0FE] mb-3" />
              <p className="font-semibold text-slate-800 text-sm">Chat</p>
              <p className="text-xs text-slate-500 mt-1">Send messages</p>
            </button>
          </div>

          {/* Watchlist */}
          <div className="md:col-span-8 lg:col-span-12 glass-card rounded-3xl p-6 animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                  Our Watchlist
                </span>
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="add-to-watchlist-button"
                    size="sm"
                    disabled={!isPaired}
                    className="rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-white/40 rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="font-bold text-slate-800">Add to Watchlist</DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">Add a movie or show to your shared watchlist</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input
                      data-testid="watchlist-title-input"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Movie or show name..."
                      className="rounded-xl bg-white/50 border-slate-200 h-12"
                      onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
                    />
                    <Button
                      data-testid="watchlist-add-confirm"
                      onClick={addToWatchlist}
                      className="w-full rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white h-11"
                    >
                      Add to List
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {watchlist.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                {isPaired ? "Your watchlist is empty. Add something!" : "Pair with your partner to create a shared watchlist"}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {watchlist.map((item) => (
                  <div
                    key={item.id}
                    data-testid={`watchlist-item-${item.id}`}
                    className="bg-white/40 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/60 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className="rounded-full text-[10px] cursor-pointer"
                          variant={item.status === "watching" ? "default" : "secondary"}
                          onClick={() =>
                            updateStatus(item.id, item.status === "watching" ? "watched" : "watching")
                          }
                          data-testid={`watchlist-status-${item.id}`}
                        >
                          {item.status === "want_to_watch" ? "Want" : item.status === "watching" ? "Watching" : "Watched"}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{item.added_by}</span>
                      </div>
                    </div>
                    <button
                      data-testid={`watchlist-delete-${item.id}`}
                      onClick={() => deleteFromWatchlist(item.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
