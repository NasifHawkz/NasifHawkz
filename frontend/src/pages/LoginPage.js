import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Mail, Lock, Eye, EyeOff } from "lucide-react";

function formatError(detail) {
  if (!detail) return "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url(https://images.pexels.com/photos/2088142/pexels-photo-2088142.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="glass-card rounded-3xl p-8 sm:p-12 w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#1E1B4B] flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">DuoWatch</h1>
            <p className="text-sm text-slate-500 font-medium">Movie nights, miles apart</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10 rounded-xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-purple-300 border-slate-200 h-12"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                data-testid="login-password-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="pl-10 pr-10 rounded-xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-purple-300 border-slate-200 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                data-testid="toggle-password-visibility"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div data-testid="login-error" className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">
              {error}
            </div>
          )}

          <Button
            data-testid="login-submit-button"
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#1E1B4B] hover:bg-[#312E81] text-white h-12 text-base font-semibold btn-lift"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          New here?{" "}
          <Link data-testid="go-to-register" to="/register" className="text-[#1E1B4B] font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
