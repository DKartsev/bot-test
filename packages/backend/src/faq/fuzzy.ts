import Fuse from "fuse.js";
import { FaqPair, loadFaq } from "./store.js";
import { normalize, tokensRU } from "../nlp/text.js";

let fuse: Fuse<FaqPair> | null = null;

function getFuse() {
  if (!fuse) {
    fuse = new Fuse(loadFaq(), {
      keys: ["q"],
      includeScore: true,
      threshold: 0.45,
      ignoreLocation: true,
      distance: 150,
      minMatchCharLength: 2,
      getFn: (obj, path) => {
        if (path[0] === "q") return tokensRU(obj.q);
        // @ts-ignore
        return obj[path[0]];
      },
    });
  }
  return fuse;
}

export function findFuzzy(query: string): { hit?: FaqPair; score?: number } {
  const res = getFuse().search(tokensRU(query).join(" "), { limit: 1 })[0];
  if (res && res.score !== undefined && res.score <= 0.5) {
    return { hit: res.item, score: res.score };
  }
  return {};
}
