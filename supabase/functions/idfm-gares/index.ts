// =============================================================================
// ARCADIA SUBLINE — Edge Function `idfm-gares`
// Ingestion des stations MÉTRO depuis le référentiel LÉGER IDFM (open data ODS,
// dataset `arrets-lignes`) — alternative à `gtfs-ingest` quand le GTFS-horaires
// complet dépasse la limite mémoire (256 Mo) des Edge Functions.
//
// Pourquoi ce chemin : le GTFS-horaires IDFM (tous modes) bufferisé en mémoire
// déclenche WORKER_RESOURCE_LIMIT sur Edge Functions. Le dataset `arrets-lignes`
// (arrêt ↔ ligne ↔ mode + lat/lon) est petit et filtrable côté serveur
// (`where=mode = "Metro"`), donc tient largement en mémoire.
//
// Pilotage par le body :
//   { inspect:true, datasets?:[...] }
//       → sonde le schéma réel (échantillon + clés), n'écrit rien.
//   { network_id, dataset, where?, mapping:{name,lat,lon,geo,mode,mode_value,ext_id,line} }
//       → filtre, dédoublonne par stop_id, insère en staging, puis appelle la
//         RPC SQL fn_gtfs_match_and_upsert (matching ref > nom+géo > création).
//
// Déploiement : verify_jwt=false (écriture via SERVICE_ROLE injecté par la
// plateforme). Invocation : POST avec header apikey (anon).
//   Ex. body d'ingestion métro :
//   { "network_id":"<uuid>", "dataset":"arrets-lignes", "where":"mode = \"Metro\"",
//     "mapping":{"name":"stop_name","lat":"stop_lat","lon":"stop_lon",
//                "geo":"pointgeo","mode":"mode","mode_value":"METRO",
//                "ext_id":"stop_id","line":"shortname"} }
//
// NB topologie : `arrets-lignes` donne l'appartenance arrêt↔ligne (shortname)
// mais PAS l'ordre des stations. line_stations.position reste à reconstruire
// depuis stop_times (cf. gtfs-ingest, extension point n°1).
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const ODS = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets";

async function fetchAll(dataset: string, where?: string): Promise<any[]> {
  const qs = where ? `?where=${encodeURIComponent(where)}` : "";
  const url = `${ODS}/${dataset}/exports/json${qs}`;
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`export ${dataset} HTTP ${r.status}`);
  return await r.json();
}

function pickGeo(rec: any, geoF?: string, latF?: string, lonF?: string): [number | null, number | null] {
  let lat: number | null = null, lon: number | null = null;
  if (geoF && rec[geoF] != null) {
    const g = rec[geoF];
    if (Array.isArray(g)) { lat = Number(g[0]); lon = Number(g[1]); }
    else if (typeof g === "object") { lat = Number(g.lat ?? g.latitude ?? g.y); lon = Number(g.lon ?? g.lng ?? g.longitude ?? g.x); }
  }
  if (latF && rec[latF] != null) lat = parseFloat(rec[latF]);
  if (lonF && rec[lonF] != null) lon = parseFloat(rec[lonF]);
  if (!Number.isFinite(lat as number)) lat = null;
  if (!Number.isFinite(lon as number)) lon = null;
  return [lat, lon];
}

Deno.serve(async (req: Request) => {
  const t0 = Date.now();
  try {
    const body = await req.json().catch(() => ({}));

    // ---- MODE INSPECT : découvre le schéma réel (aucune écriture) ----
    if (body.inspect) {
      const datasets: string[] = body.datasets ?? ["emplacement-des-gares-idf", "arrets-lignes", "arrets"];
      const probe: any[] = [];
      for (const ds of datasets) {
        try {
          const r = await fetch(`${ODS}/${ds}/records?limit=2`, { redirect: "follow" });
          if (!r.ok) { probe.push({ ds, ok: false, status: r.status }); continue; }
          const j = await r.json();
          probe.push({ ds, ok: true, total_count: j.total_count, fields: Object.keys((j.results ?? [])[0] ?? {}), sample: (j.results ?? []).slice(0, 2) });
        } catch (e) { probe.push({ ds, ok: false, error: String(e) }); }
      }
      return Response.json({ inspect: true, probe, duration_ms: Date.now() - t0 });
    }

    // ---- MODE INGEST ----
    const networkId: string | undefined = body.network_id;
    const dataset: string | undefined = body.dataset;
    if (!networkId || !dataset) return Response.json({ error: "network_id & dataset requis" }, { status: 400 });
    const m = body.mapping ?? {};
    const nameF = m.name, geoF = m.geo, latF = m.lat, lonF = m.lon, modeF = m.mode, idF = m.ext_id;
    const modeVal = String(m.mode_value ?? "METRO").toUpperCase();

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const ingestRunId = crypto.randomUUID();

    const all = await fetchAll(dataset, body.where);
    const rows = all.filter((rec) => !modeF ? true : String(rec[modeF] ?? "").toUpperCase().includes(modeVal));

    const seen = new Set<string>();
    const staged: any[] = [];
    const lines = new Map<string, Set<string>>(); // shortname -> set(stop_id) (bonus topologie future)
    for (const rec of rows) {
      const name = nameF ? rec[nameF] : null;
      if (!name) continue;
      const [lat, lon] = pickGeo(rec, geoF, latF, lonF);
      const extId = idF && rec[idF] != null ? String(rec[idF]) : `${String(name).toUpperCase()}|${lat}|${lon}`;
      if (m.line && rec[m.line] != null) {
        const ln = String(rec[m.line]);
        if (!lines.has(ln)) lines.set(ln, new Set());
        lines.get(ln)!.add(extId);
      }
      if (seen.has(extId)) continue;
      seen.add(extId);
      staged.push({ ingest_run_id: ingestRunId, stop_id: extId, stop_name: String(name), stop_lat: lat, stop_lon: lon, location_type: "1", parent_station: null, raw: rec });
    }

    await supabase.from("gtfs_stops_staging").delete().lt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());
    for (let i = 0; i < staged.length; i += 1000) {
      const { error } = await supabase.from("gtfs_stops_staging").insert(staged.slice(i, i + 1000));
      if (error) throw new Error(`staging ${i}: ${error.message}`);
    }

    const { data: report, error: rpcErr } = await supabase.rpc("fn_gtfs_match_and_upsert", { p_network_id: networkId, p_ingest_run_id: ingestRunId, p_match_radius_m: 300 });
    if (rpcErr) throw new Error(`rpc: ${rpcErr.message}`);

    return Response.json({ ok: true, dataset, ingest_run_id: ingestRunId, total_source: all.length, metro_filtered: rows.length, staged: staged.length, lines_seen: [...lines.keys()].sort(), report: report?.[0] ?? report, duration_ms: Date.now() - t0 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err), duration_ms: Date.now() - t0 }, { status: 500 });
  }
});
