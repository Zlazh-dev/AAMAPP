// graphify OpenCode plugin — STRICT MODE
// Memblokir pembacaan file mentah PERTAMA tiap sesi (grep/cat/find/dst.) dan
// mengalihkan agent ke `graphify query`. Setelah sekali menegur, sesi kembali
// normal (agar tak macet) — mirror perilaku strict Claude Code.
//
// PENTING: string tetap bebas backtick dan $(...) — hook memakai `echo "..."`;
// backtick di dalam echo memicu command substitution PowerShell/bash.
import { existsSync } from "fs";
import { join } from "path";

// Perintah "baca mentah" yang diblokir. git/npm/docker/curl/psql/graphify TIDAK
// cocok, jadi tetap jalan normal.
const RAW_READ =
  /\b(grep|rg|ag|ack|cat|less|head|tail|find|sed|awk|bat|batcat)\b/i;

export const GraphifyPlugin = async ({ directory }) => {
  let fired = false; // sudah menegur sekali sesi ini?

  return {
    "tool.execute.before": async (input, output) => {
      if (fired) return; // sudah sekali — biarkan semua lewat
      if (!existsSync(join(directory, "graphify-out", "graph.json"))) return;
      if (input.tool !== "bash") return;

      const cmd = String(output.args.command || "");
      if (/\bgraphify\b/i.test(cmd)) return; // perintah graphify sendiri: lolos
      if (!RAW_READ.test(cmd)) return; // bukan baca-mentah: lolos

      // STRICT: ganti perintah dgn penolakan — grep/cat mentah TIDAK dijalankan.
      // ';' bukan '&&' (PowerShell 5.1 menolak '&&').
      fired = true;
      output.args.command =
        'echo "[graphify STRICT] Baca file mentah diblokir sekali di awal sesi. Jalankan graphify query <pertanyaan> (atau graphify explain / graphify path) untuk sub-graf terarah dari graphify-out/graph.json — jauh lebih ringan daripada grep. Setelah ini, baca mentah kembali diizinkan." ; ' +
        "true";
    },
  };
};
