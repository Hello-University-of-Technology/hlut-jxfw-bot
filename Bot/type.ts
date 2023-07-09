import { Context } from "https://deno.land/x/grammy@v1.17.1/context.ts";
import { SessionFlavor } from "https://deno.land/x/grammy@v1.17.1/mod.ts";
import { JxfwMgr } from "../API/jxfwmgr.ts";

export interface SessionData {
  jxfwMgr: JxfwMgr | undefined;
  hasSub: boolean | undefined;
  lastSentSubMsg: number | undefined;
}

export type MyContext = Context & SessionFlavor<SessionData>;