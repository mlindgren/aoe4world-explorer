import { ITEMS, DATA_ROOT, MUTED_UNITS } from "../config";
import { patches } from "../data/patches/patch";
import { Unit, Technology, Upgrade, UnifiedItem, civAbbr, Building, civConfig } from "../types/data";
import { PatchLine, PatchNotes } from "../types/patches";
import { canonicalItemName } from "./utils";

type ItemTypes = {
  [ITEMS.UNITS]: Unit;
  [ITEMS.TECHNOLOGIES]: Technology;
  [ITEMS.BUILDINGS]: Building;
  [ITEMS.UPGRADES]: Upgrade;
};

const itemsCache = {
  [ITEMS.UNITS]: new Map<string, UnifiedItem<Unit>>(),
  [ITEMS.TECHNOLOGIES]: new Map<string, UnifiedItem<Technology>>(),
  [ITEMS.BUILDINGS]: new Map<string, UnifiedItem<Building>>(),
  [ITEMS.UPGRADES]: new Map<string, UnifiedItem<Upgrade>>(),
};

export async function fetchItems<T extends ITEMS>(type: T): Promise<UnifiedItem<ItemTypes[T]>[]> {
  const res = await fetchJson<{ data: UnifiedItem<ItemTypes[T]>[] }>(`${DATA_ROOT}/${type}/all-unified.json`, true);
  const items = [];
  for (const item of res.data) {
    if (MUTED_UNITS.includes(item.id)) continue;
    (itemsCache[type] as Map<string, UnifiedItem<ItemTypes[T]>>).set(item.id, item);
    items.push(item);
  }
  return items;
}

export function fetchItem<T extends ITEMS>(type: T, id: string) {
  return fetchJson<UnifiedItem<ItemTypes[T]>>(`${DATA_ROOT}/${type}/unified/${id}.json`, true);
}

export async function getItem<T extends ITEMS>(type: T, id: string) {
  if (!itemsCache[type].size) await fetchItems(type);
  return (itemsCache[type] as Map<string, UnifiedItem<ItemTypes[T]>>).get(id);
}

export async function getItems<T extends ITEMS>(type: T, civ: civAbbr) {
  if (!itemsCache[type].size) await fetchItems(type);
  return [...(itemsCache[type] as Map<string, UnifiedItem<ItemTypes[T]>>).values()].filter((item) => !civ || item.civs.includes(civ));
}

const pendingRequests = new Map<string, Promise<any>>();
const cache = new Map();
/** Request a json file and deduplicate requests to single promises, optionally stored in cache */
export async function fetchJson<T = any>(url: string, useCache = false): Promise<T> {
  if (useCache && cache.has(url)) return cache.get(url);
  if (pendingRequests.has(url)) return pendingRequests.get(url);
  const request = new Promise<T>(async (resolve, reject) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        try {
          const data = await response.json();
          if (useCache || cache.has(url)) cache.set(url, data);
          resolve(data);
        } catch {
          reject(new Error("Error parsing response format (not JSON)"));
        } finally {
          pendingRequests.delete(url);
        }
      } else {
        reject(new Error(`${response.status} ${response.statusText}`));
      }
    } catch (e) {
      reject(new Error(`Error requesting data from ${url}: ${e.message}`));
    }
  });

  pendingRequests.set(url, request);
  return request;
}

const patchOrder = ["buff", "nerf", "fix"];
export const sortPatchDiff = (a: PatchLine, b: PatchLine) => patchOrder.indexOf(a[0]) - patchOrder.indexOf(b[0]);

/** Get all changes, line by line, that apply to a specific item */
export async function getPatchHistory(item: UnifiedItem, civs?: civConfig[]) {
  const cid = canonicalItemName(item);
  const civAbbrs = civs?.map((c) => c.abbr);
  const history: { patch: PatchNotes; diff: PatchLine[] }[] = [];
  for (const patch of patches) {
    const diff = [];
    for (const section of patch.sections) {
      if (!civOverlap(civAbbrs, section.civs)) continue;
      diff.push(
        ...section.changes.reduce(
          (acc, c) => (c.items.includes(cid) && civOverlap(civAbbrs, c.civs) ? [...acc, ...c.diff.filter(([t, l, lc]) => civOverlap(civAbbrs, lc))] : acc),
          [] as PatchLine[]
        )
      );
    }
    if (diff.length) {
      diff.sort(sortPatchDiff);
      history.push({ patch, diff });
    }
  }
  return history.sort((a, b) => b.patch.date.getTime() - a.patch.date.getTime());
}

function civOverlap(filter: civAbbr[], value: civAbbr[]) {
  if (!value?.length || !filter?.length) return true;
  return filter.some((c) => value.includes(c));
}

export async function getPatch(id: string) {
  return patches.find((patch) => patch.id === id);
}
