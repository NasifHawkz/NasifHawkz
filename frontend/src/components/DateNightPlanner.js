import { useState, useEffect, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarHeart, Clock, Sparkles, Trash2, Plus, Check, PartyPopper } from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import axios from "axios";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIME_SLOTS = [];
for (let h = 18; h <= 23; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}
for (let h = 0; h <= 2; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

function getDateLabel(dateStr) {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Tonight";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

function getCountdown(dateStr, time) {
  try {
    const dt = new Date(`${dateStr}T${time}:00`);
    if (isPast(dt)) return "Past";
    return formatDistanceToNow(dt, { addSuffix: true });
  } catch {
    return "";
  }
}

export default function DateNightPlanner({ watchlist = [], isPaired = false }) {
  const [dateNights, setDateNights] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [time, setTime] = useState("20:00");
  const [movie, setMovie] = useState("");
  const [notes, setNotes] = useState("");
  const [showCalPicker, setShowCalPicker] = useState(false);

  const fetchDateNights = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/date-nights`, { withCredentials: true });
      setDateNights(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchDateNights();
  }, [fetchDateNights]);

  const createDateNight = async () => {
    if (!title.trim() || !selectedDate) {
      toast.error("Pick a title and date");
      return;
    }
    try {
      await axios.post(
        `${API}/date-nights`,
        {
          title: title.trim(),
          date: format(selectedDate, "yyyy-MM-dd"),
          time,
          movie,
          notes: notes.trim(),
        },
        { withCredentials: true }
      );
      toast.success("Date night planned!");
      setShowDialog(false);
      setTitle("");
      setSelectedDate(null);
      setTime("20:00");
      setMovie("");
      setNotes("");
      fetchDateNights();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const markComplete = async (id) => {
    await axios.put(`${API}/date-nights/${id}`, { status: "completed" }, { withCredentials: true });
    fetchDateNights();
    toast.success("Hope you had a great time!");
  };

  const deleteNight = async (id) => {
    await axios.delete(`${API}/date-nights/${id}`, { withCredentials: true });
    fetchDateNights();
  };

  const upcoming = dateNights.filter((n) => n.status === "upcoming" && !isPast(new Date(`${n.date}T23:59:59`)));
  const past = dateNights.filter((n) => n.status === "completed" || (n.status === "upcoming" && isPast(new Date(`${n.date}T23:59:59`))));
  const nextNight = upcoming[0];

  return (
    <div className="glass-card rounded-3xl p-6 animate-fade-in-up stagger-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarHeart className="w-4 h-4 text-[#D8B4E2]" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
            Date Night Planner
          </span>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button
              data-testid="plan-date-night-button"
              size="sm"
              disabled={!isPaired}
              className="rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white"
            >
              <Plus className="w-4 h-4 mr-1" /> Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-white/40 rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Plan a Date Night</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Schedule your next movie night together
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
                  What are we doing?
                </label>
                <Input
                  data-testid="date-night-title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Movie night, binge session..."
                  className="rounded-xl bg-white/50 border-slate-200 h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
                    Date
                  </label>
                  <Popover open={showCalPicker} onOpenChange={setShowCalPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        data-testid="date-night-date-picker"
                        variant="outline"
                        className="w-full rounded-xl bg-white/50 border-slate-200 h-11 justify-start text-left font-normal text-sm"
                      >
                        <CalendarHeart className="w-4 h-4 mr-2 text-[#D8B4E2]" />
                        {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => {
                          setSelectedDate(d);
                          setShowCalPicker(false);
                        }}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
                    Time
                  </label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger
                      data-testid="date-night-time-select"
                      className="rounded-xl bg-white/50 border-slate-200 h-11"
                    >
                      <Clock className="w-4 h-4 mr-2 text-[#BDE0FE]" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TIME_SLOTS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {watchlist.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
                    Movie from watchlist (optional)
                  </label>
                  <Select value={movie} onValueChange={setMovie}>
                    <SelectTrigger
                      data-testid="date-night-movie-select"
                      className="rounded-xl bg-white/50 border-slate-200 h-11"
                    >
                      <SelectValue placeholder="Choose from watchlist..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">No specific movie</SelectItem>
                      {watchlist.map((w) => (
                        <SelectItem key={w.id} value={w.title}>
                          {w.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">
                  Notes (optional)
                </label>
                <Input
                  data-testid="date-night-notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Snacks to prepare, outfit ideas..."
                  className="rounded-xl bg-white/50 border-slate-200 h-11"
                />
              </div>

              <Button
                data-testid="date-night-create-button"
                onClick={createDateNight}
                className="w-full rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white h-11 font-semibold btn-lift"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Schedule Date Night
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Next Date Night Hero */}
      {nextNight ? (
        <div
          data-testid="next-date-night-card"
          className="bg-gradient-to-r from-[#1E1B4B] to-[#312E81] rounded-2xl p-5 mb-4 text-white"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/60 mb-1">Next Date Night</p>
              <h3 className="text-lg font-bold mb-1">{nextNight.title}</h3>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <CalendarHeart className="w-3.5 h-3.5" />
                  {getDateLabel(nextNight.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {nextNight.time}
                </span>
              </div>
              {nextNight.movie && nextNight.movie !== "none" && (
                <p className="text-xs text-white/60 mt-2">Watching: {nextNight.movie}</p>
              )}
              {nextNight.notes && (
                <p className="text-xs text-white/50 mt-1">{nextNight.notes}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <Badge className="bg-white/20 text-white rounded-full text-xs mb-2">
                {getCountdown(nextNight.date, nextNight.time)}
              </Badge>
              <div className="flex gap-1 mt-1">
                <button
                  data-testid={`date-night-complete-${nextNight.id}`}
                  onClick={() => markComplete(nextNight.id)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Mark as done"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  data-testid={`date-night-delete-${nextNight.id}`}
                  onClick={() => deleteNight(nextNight.id)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-red-500/30 transition-colors"
                  title="Cancel"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <PartyPopper className="w-8 h-8 text-[#D8B4E2] mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {isPaired ? "No date nights planned yet. Schedule one!" : "Pair with your partner first"}
          </p>
        </div>
      )}

      {/* Upcoming list */}
      {upcoming.length > 1 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Upcoming</p>
          {upcoming.slice(1).map((n) => (
            <div
              key={n.id}
              data-testid={`date-night-upcoming-${n.id}`}
              className="bg-white/40 rounded-xl p-3 flex items-center justify-between group hover:bg-white/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{n.title}</p>
                <p className="text-xs text-slate-500">
                  {getDateLabel(n.date)} at {n.time}
                  {n.movie && n.movie !== "none" ? ` \u00B7 ${n.movie}` : ""}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  data-testid={`date-night-complete-${n.id}`}
                  onClick={() => markComplete(n.id)}
                  className="p-1 rounded-full hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  data-testid={`date-night-delete-${n.id}`}
                  onClick={() => deleteNight(n.id)}
                  className="p-1 rounded-full hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past date nights */}
      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Past</p>
          {past.slice(0, 3).map((n) => (
            <div
              key={n.id}
              data-testid={`date-night-past-${n.id}`}
              className="bg-white/20 rounded-xl p-3 flex items-center justify-between opacity-60"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-600 text-sm truncate line-through">{n.title}</p>
                <p className="text-xs text-slate-400">{getDateLabel(n.date)}</p>
              </div>
              <button
                onClick={() => deleteNight(n.id)}
                className="text-slate-300 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
