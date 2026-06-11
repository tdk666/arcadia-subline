// =============================================================================
// ARCADIA SUBLINE — Edge Function `gtfs-ingest` (v2)
// Ingestion du référentiel GTFS IDFM, FILTRÉE MÉTRO (M1–M14) pour le MVP.
//
// Source officielle (Licence Mobilités, accès ouvert) :
//   Jeu "Horaires prévus sur les lignes de transport en commun d'Île-de-France
//   (GTFS)" — id : offre-horaires-tc-gtfs-idfm — rafraîchi 3×/jour (8h/13h/17h).
// Stratégie d'URL : liste de candidats ordonnée, validée par HEAD/GET au
// démarrage ; la première URL joignable gagne. Épingler GTFS_URL en secret
// dès que le permalien transport.data.gouv.fr du déploiement est connu.
//
// Pipeline (3 passes streaming sur le ZIP bufferisé — on n'inflate QUE les
// fichiers utiles, stop_times.txt n'est jamais tenu en mémoire) :
//   P1. routes.txt  (≈ko)  → route_ids métro (route_type=1, nom M1…M14)
//       stops.txt   (≈Mo)  → bufferisé : stations mères + quais (parent_station)
//   P2. trips.txt   (gros) → stream : trip_ids appartenant aux routes métro
//   P3. stop_times.txt (très gros) → stream : stop_ids (quais) desservis métro
//   → mères métro = mères ayant ≥1 quai enfant desservi → staging → RPC SQL
//     fn_gtfs_match_and_upsert (matching ref courante > nom+géo > création).
//
// Déploiement : supabase functions deploy gtfs-ingest --no-verify-jwt
// Invocation  : POST {"network_id": "<uuid>"} avec Authorization: Bearer <SERVICE_ROLE_KEY>
// ⚠ CPU : l'inflation de stop_times (~centaines de Mo) demande le plan où les
//   Edge Functions disposent d'un budget CPU étendu ; à défaut, exécuter en
//   local (`supabase functions serve`) ou via METRO_ONLY=false (skip P2/P3).
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { Unzip, UnzipInflate, unzipSync, strFromU8 } from "npm:fflate@0.8.2";

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------
const GTFS_URL_CANDIDATES: string[] = [
  // 1) Secret épinglé par l'exploitant (prioritaire) — idéalement le permalien
  //    de ressource transport.data.gouv.fr (stable, pensé pour les jobs) :
  //    https://transport.data.gouv.fr/datasets/horaires-prevus-sur-les-lignes-de-transport-en-commun-dile-de-france-gtfs
  Deno.env.get("GTFS_URL") ?? "",
  // 2) Export historique stable du jeu IDFM (hébergement Opendatasoft)
  "https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip",
  // 3) Export "fichiers" du portail data.iledefrance-mobilites.fr (ODS)
  "https://data.iledefrance-mobilites.fr/api/datasets/1.0/offre-horaires-tc-gtfs-idfm/alternative_exports/idfm_gtfs_zip",
].filter((u) => u.length > 0);

const BATCH_SIZE = 1000;        // lots d'insertion en staging
const MATCH_RADIUS_M = 300;     // rayon de matching géo (fn_gtfs_match_and_upsert)
const METRO_ONLY = (Deno.env.get("METRO_ONLY") ?? "true") !== "false";

// ----------------------------------------------------------------------------
// CSV : parseur robuste (champs quotés) pour les petits fichiers, et splitter
// naïf rapide pour les flux massifs (trips/stop_times IDFM : pas de quotes).
// ----------------------------------------------------------------------------
function parseCsvLine(line: string): string[] {
  if (!line.includes('"')) return line.split(",");
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^\uFEFF/, ""));
  return lines.slice(1).map((l) => {
    const v = parseCsvLine(l);
    return Object.fromEntries(headers.map((h, i) => [h, v[i] ?? ""]));
  });
}

// ----------------------------------------------------------------------------
// Streaming : parcourt le ZIP (déjà en mémoire compressé) et n'INFLATE que
// `fileName`, en livrant les lignes une à une (jamais le fichier entier).
// fflate n'appelle l'inflation que si on `start()` l'entrée → les autres
// fichiers du ZIP ne coûtent rien.
// ----------------------------------------------------------------------------
function streamZipFileLines(
  zipBytes: Uint8Array,
  fileName: string,
  onLine: (cols: string[], header: string[]) => void,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let found = false;
    const unzip = new Unzip((file) => {
      if (file.name !== fileName) return;       // entrée ignorée : pas d'inflation
      found = true;
      const decoder = new TextDecoder("utf-8");
      let tail = "";                              // ligne partielle inter-chunks
      let header: string[] | null = null;
      file.ondata = (err, chunk, final) => {
        if (err) return reject(err);
        const text = tail + decoder.decode(chunk, { stream: !final });
        const lines = text.split(/\r?\n/);
        tail = final ? "" : (lines.pop() ?? "");
        for (const line of lines) {
          if (!line) continue;
          if (!header) {
            header = parseCsvLine(line).map((h) => h.trim().replace(/^\uFEFF/, ""));
            continue;
          }
          onLine(parseCsvLine(line), header);
        }
        if (final) resolve(true);
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    // Push par tranches de 1 Mo (fflate gère la reprise inter-chunks)
    const CHUNK = 1 << 20;
    for (let i = 0; i < zipBytes.length; i += CHUNK) {
      unzip.push(zipBytes.subarray(i, Math.min(i + CHUNK, zipBytes.length)), i + CHUNK >= zipBytes.length);
    }
    // Si l'entrée n'existe pas, aucun ondata ne résoudra la promesse :
    queueMicrotask(() => { if (!found) resolve(false); });
  });
}

// ----------------------------------------------------------------------------
// Sélection d'URL : première candidate joignable (HEAD, fallback GET range)
// ----------------------------------------------------------------------------
async function resolveGtfsUrl(): Promise<string> {
  for (const url of GTFS_URL_CANDIDATES) {
    try {
      let res = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (!res.ok && res.status === 405) {
        // certains hôtes refusent HEAD : on sonde 1 octet
        res = await fetch(url, { headers: { Range: "bytes=0-0" }, redirect: "follow" });
      }
      if (res.ok) return url;
      console.warn(`[gtfs-ingest] candidat KO (${res.status}) : ${url}`);
    } catch (e) {
      console.warn(`[gtfs-ingest] candidat injoignable : ${url} — ${e}`);
    }
  }
  throw new Error("Aucune URL GTFS joignable. Épingler le secret GTFS_URL (permalien transport.data.gouv.fr).");
}

// ----------------------------------------------------------------------------
// Handler principal
// ----------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const t0 = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const networkId: string | undefined = body.network_id;
    if (!networkId) return Response.json({ error: "network_id requis" }, { status: 400 });
    const ingestRunId = crypto.randomUUID();

    // ----- 1) DOWNLOAD : URL vérifiée au démarrage ---------------------------
    const gtfsUrl = body.gtfs_url ?? await resolveGtfsUrl();
    const res = await fetch(gtfsUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`Téléchargement GTFS échoué : HTTP ${res.status} (${gtfsUrl})`);
    const zipBytes = new Uint8Array(await res.arrayBuffer());
    console.log(`[gtfs-ingest] ZIP ${(zipBytes.length / 1e6).toFixed(1)} Mo depuis ${gtfsUrl}`);

    // ----- 2) PASSE 1 : routes.txt + stops.txt (petits → unzipSync ciblé) ----
    const small = unzipSync(zipBytes, { filter: (f) => f.name === "routes.txt" || f.name === "stops.txt" });
    if (!small["stops.txt"]) throw new Error("stops.txt absent du ZIP GTFS");
    const stops = parseCsv(strFromU8(small["stops.txt"]));

    // Routes métro : route_type=1 (subway). Le short_name M1…M14 sert de
    // garde-fou contre d'éventuels type=1 hors métro (ex: navettes).
    let metroRouteIds = new Set<string>();
    if (METRO_ONLY && small["routes.txt"]) {
      for (const r of parseCsv(strFromU8(small["routes.txt"]))) {
        const sn = (r.route_short_name ?? "").toUpperCase();
        if (r.route_type === "1" && /^M?\d{1,2}(B|BIS)?$/.test(sn)) metroRouteIds.add(r.route_id);
      }
      console.log(`[gtfs-ingest] ${metroRouteIds.size} routes métro retenues`);
    }

    // ----- 3) PASSES 2+3 : trips → stop_times (streaming, métro only) --------
    // quais desservis par le métro ; null = pas de filtre (METRO_ONLY=false)
    let metroQuayIds: Set<string> | null = null;
    if (METRO_ONLY && metroRouteIds.size > 0) {
      const metroTripIds = new Set<string>();
      await streamZipFileLines(zipBytes, "trips.txt", (cols, h) => {
        const route = cols[h.indexOf("route_id")];
        if (metroRouteIds.has(route)) metroTripIds.add(cols[h.indexOf("trip_id")]);
      });
      console.log(`[gtfs-ingest] ${metroTripIds.size} courses métro`);

      metroQuayIds = new Set<string>();
      await streamZipFileLines(zipBytes, "stop_times.txt", (cols, h) => {
        if (metroTripIds.has(cols[h.indexOf("trip_id")])) {
          metroQuayIds!.add(cols[h.indexOf("stop_id")]);
        }
      });
      console.log(`[gtfs-ingest] ${metroQuayIds.size} quais métro desservis`);
    }

    // ----- 4) SÉLECTION : stations mères dont ≥1 quai enfant est métro --------
    const motherById = new Map<string, Record<string, string>>();
    const metroMotherIds = new Set<string>();
    for (const s of stops) if ((s.location_type ?? "") === "1") motherById.set(s.stop_id, s);
    if (metroQuayIds) {
      for (const s of stops) {
        // un quai (location_type 0/vide) rattache sa mère via parent_station
        if ((s.location_type ?? "0") !== "1" && metroQuayIds.has(s.stop_id) && s.parent_station) {
          metroMotherIds.add(s.parent_station);
        }
      }
    }
    const selected = [...motherById.values()].filter(
      (s) => !metroQuayIds || metroMotherIds.has(s.stop_id),
    );
    console.log(`[gtfs-ingest] ${selected.length}/${motherById.size} stations mères retenues`);

    // ----- 5) STAGING : purge des runs > 7 j + insertion par lots --------------
    await supabase.from("gtfs_stops_staging").delete()
      .lt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());

    for (let i = 0; i < selected.length; i += BATCH_SIZE) {
      const batch = selected.slice(i, i + BATCH_SIZE).map((s) => ({
        ingest_run_id: ingestRunId,
        stop_id: s.stop_id,
        stop_name: s.stop_name || null,
        stop_lat: s.stop_lat ? parseFloat(s.stop_lat) : null,
        stop_lon: s.stop_lon ? parseFloat(s.stop_lon) : null,
        location_type: s.location_type || null,
        parent_station: s.parent_station || null,
        raw: s,
      }));
      const { error } = await supabase.from("gtfs_stops_staging").insert(batch);
      if (error) throw new Error(`Staging batch ${i / BATCH_SIZE}: ${error.message}`);
    }

    // ----- 6) MATCHING + UPSERT : logique transactionnelle en SQL --------------
    const { data: report, error: rpcError } = await supabase.rpc("fn_gtfs_match_and_upsert", {
      p_network_id: networkId,
      p_ingest_run_id: ingestRunId,
      p_match_radius_m: MATCH_RADIUS_M,
    });
    if (rpcError) throw new Error(`Matching SQL: ${rpcError.message}`);

    // >>> EXTENSION POINT n°1 — TOPOLOGIE : reconstruire line_stations.position
    //     depuis stop_times (ordre stop_sequence d'une course type par route).
    // >>> EXTENSION POINT n°2 — DIFF & ALERTING : stations disparues du GTFS
    //     → clore source_refs.valid_to + notifier les ops.
    // >>> EXTENSION POINT n°3 — MATCHING AVANCÉ : pg_trgm sur les ambigus,
    //     file de revue manuelle gtfs_match_review.
    // >>> EXTENSION POINT n°4 — PLANIFICATION : pg_cron + pg_net après chaque
    //     rafraîchissement IDFM (8h/13h/17h Europe/Paris) :
    //     select cron.schedule('gtfs_after_refresh', '30 8,13,17 * * *',
    //       $$ select net.http_post(url => '.../functions/v1/gtfs-ingest', ...) $$);

    return Response.json({
      ok: true,
      ingest_run_id: ingestRunId,
      gtfs_url: gtfsUrl,
      metro_only: METRO_ONLY,
      mother_stations_selected: selected.length,
      report: report?.[0] ?? report,             // { created, relinked, unchanged }
      duration_ms: Date.now() - t0,
    });
  } catch (err) {
    console.error("[gtfs-ingest]", err);
    return Response.json(
      { ok: false, error: String(err), duration_ms: Date.now() - t0 },
      { status: 500 },
    );
  }
});
