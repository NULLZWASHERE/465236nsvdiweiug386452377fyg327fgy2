import { NextResponse } from "next/server";

const ADJS = ["swift","bold","calm","dark","epic","fast","gold","icy","jade","keen","lazy","mild","neat","odd","pale","quick","rare","slim","tall","vast","warm","zany","azure","brisk","crisp","neon","lunar","misty","pixel","rusty","silver","teal","ultra","vivid","wild","xenon","zinc","amber","blaze","cobalt","drift","ember","flint","ghost","iron","jolly","fierce","hollow","obsidian"];
const NOUNS = ["fox","wolf","hawk","bear","deer","lynx","crow","fern","moss","rock","star","moon","wave","dust","mist","leaf","pine","oak","ash","ivy","sage","dawn","void","byte","node","core","flux","prism","cipher","ridge","storm","blade","crest","forge","isle","lark","maze","orbit","pulse","quest","realm","shade","tide","veil","wisp","zone","echo","frost","brook","delta"];
const ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randStr(n: number) { return Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join(""); }

export async function GET() {
  const username = `${pick(ADJS)}.${pick(NOUNS)}.${randStr(4)}`;
  return NextResponse.json({ email: `${username}@zekoro.fun`, username });
}
