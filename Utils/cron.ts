import Cron from "https://deno.land/x/croner@6.0.3/dist/croner.js";
import { Bot } from "https://deno.land/x/grammy@v1.17.1/bot.ts";
import { getCurriculum } from "../API/utils.ts";
import { MyContext,SessionData } from "../Bot/type.ts";
import { FileAdapter } from "../Bot/file-adapter.ts";

let jobs: Record<string, Cron> = {};

export async function addCronJob(bot: Bot<MyContext>,adapter: FileAdapter<SessionData>, chatid: string) {
  const session = await adapter.read(chatid);
  if (session == undefined || session.jxfwMgr == undefined) {
    throw Error("session not found")
  }
  jobs[chatid] = new Cron('0 */1 * * * *', async () => {
    const session = await adapter.read(chatid);
    if (session == undefined || session.jxfwMgr == undefined) {
      throw Error("session not found")
    }
    if (session.lastSentSubMsg == undefined) {
      const resp = await bot.api.sendMessage(chatid, await getCurriculum(session.jxfwMgr, "初始化"), { parse_mode: "HTML"});
      session.lastSentSubMsg = resp.message_id;
      await adapter.write(chatid, session);
      await bot.api.pinChatMessage(chatid, resp.message_id);
    } else {
      try {
        await bot.api.editMessageText(chatid, session.lastSentSubMsg, await getCurriculum(session.jxfwMgr, "更新"), { parse_mode: "HTML"})
      } catch (e) {
        console.log(e)
      }
    }
  });
}

export async function rmCronJob(bot: Bot<MyContext>, adapter: FileAdapter<SessionData>, chatid: string) {
  const session = await adapter.read(chatid);
  if (session == undefined || session.jxfwMgr == undefined) {
    throw Error("session not found")
  }
  if (session == undefined || session.hasSub != true) {
    return;
  }
  if (session.lastSentSubMsg != undefined) {
    await bot.api.unpinChatMessage(chatid, session.lastSentSubMsg);
  }
  session.hasSub = false;
  session.lastSentSubMsg = undefined;
  await adapter.write(chatid, session);
}