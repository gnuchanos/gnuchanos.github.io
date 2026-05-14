import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const out = join(__dir, "..", "gnuchanos.json");

const doc = {
  version: 1,
  generatedAt: new Date().toISOString(),
  panel: {
    centerTitle: "| Gnu-Linux My Life |",
    workspace: { active: 1, count: 4, labelPrefix: "WorkStation" },
    stats: {
      temp: 20,
      tempMax: 100,
      cpuGhz: 1.0,
      cpuMaxGhz: 3.9,
      ramMb: 115.0,
      ramTotalMb: 6192,
      netUp: 3.0,
      netDown: 4.0,
    },
  },
  launcher: {
    items: [
      { id: "pulse", label: "PulseAudio", hint: "ALT+P" },
      { id: "music", label: "Music Player", hint: "ALT+M" },
      { id: "wall", label: "Wallpaper Manager", hint: "ALT+W" },
      { id: "editor", label: "Text Editor", hint: "ALT+T" },
      { id: "calc", label: "Calculator", hint: "ALT+C" },
      { id: "alarm", label: "Alarm", hint: "ALT+A" },
      { id: "timer", label: "TIMER", hint: "ALT+SHIFT+T" },
    ],
  },
};

writeFileSync(out, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log("Wrote", out);
