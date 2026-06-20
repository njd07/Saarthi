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
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-1">Voice</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Default uses Saarthi's built-in voice. Add your ElevenLabs key for higher-quality Hindi prosody.
          </p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">Built-in voice (Browser TTS)</Label>
              <select
                value={s.voice}
                onChange={(e) => update("voice", e.target.value)}
                className="mt-1 w-full h-10 border border-input bg-background rounded-md px-3 text-sm"
              >
                {["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"].map(
                  (v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ),
                )}
              </select>
            </div>

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
          <h2 className="text-xl font-semibold mb-1">AI fallback</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Saarthi tries 5 built-in models in sequence. Optionally add your own OpenRouter key — it'll be
            used as the final fallback so the class is never stuck.
          </p>
          <Label htmlFor="or" className="text-xs">OpenRouter API key (optional)</Label>
          <Input
            id="or"
            type="password"
            placeholder="sk-or-v1-..."
            value={s.openRouterKey}
            onChange={(e) => update("openRouterKey", e.target.value)}
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Stored only in your browser. Get a free key from openrouter.ai/keys.
          </p>
        </section>

        <Button onClick={onSave} className="gap-2">
          <Save className="h-4 w-4" /> Save settings
        </Button>
      </main>
    </div>
  );
}
