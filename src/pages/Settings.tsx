import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadSettings, saveSettings } from "@/lib/settings";

import { toast } from "sonner";

export default function Settings() {
  const [s, setS] = useState(loadSettings());

  function update<K extends keyof typeof s>(k: K, v: (typeof s)[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function onSave() {
    saveSettings(s);
    toast.success("Settings saved");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="h-[18px] w-[18px]" alt="Saarthi Logo" />
            <span className="font-semibold text-sm">Settings</span>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-1">Playback Settings</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Adjust the speed of the teacher's voice.
          </p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">Speech rate ({s.speechRate.toFixed(2)}x)</Label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={s.speechRate}
                onChange={(e) => update("speechRate", parseFloat(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-1">Custom API Keys (Optional)</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Saarthi uses its own built-in AI models by default. You can override them by providing your own API keys. Keys are stored locally in your browser.
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groq" className="text-xs">Groq API Key (Primary)</Label>
              <Input
                id="groq"
                type="password"
                placeholder="gsk_..."
                value={s.groqKey}
                onChange={(e) => update("groqKey", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="or" className="text-xs">OpenRouter API Key (Secondary)</Label>
              <Input
                id="or"
                type="password"
                placeholder="sk-or-v1-..."
                value={s.openRouterKey}
                onChange={(e) => update("openRouterKey", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gemini" className="text-xs">Google Gemini API Key (Tertiary)</Label>
              <Input
                id="gemini"
                type="password"
                placeholder="AIzaSy..."
                value={s.geminiKey}
                onChange={(e) => update("geminiKey", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </section>

        <Button onClick={onSave} className="gap-2">
          <Save className="h-4 w-4" /> Save settings
        </Button>
      </main>
    </div>
  );
}
