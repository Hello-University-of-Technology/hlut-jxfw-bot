import Cron from "https://deno.land/x/croner@6.0.3/dist/croner.js";
import { Bot } from "https://deno.land/x/grammy@v1.17.1/bot.ts";
import { getCurriculum } from "../API/utils.ts";
import { MyContext,SessionData } from "../Bot/type.ts";
import { FileAdapter } from "../Bot/file-adapter.ts";

const jobs: Record<string, [Cron, Cron]> = {};

export async function addCronJob(bot: Bot<MyContext>,adapter: FileAdapter<SessionData>, chatid: string) {
  const session = await adapter.read(chatid);
  if (session == undefined || session.jxfwMgr == undefined) {
    throw Error("session not found")
  }
  if (session.lastSentSubMsg == undefined) {
    const resp = await bot.api.sendMessage(chatid,
       await getCurriculum(session.jxfwMgr, "初始化"), { parse_mode: "HTML"});
    session.lastSentSubMsg = resp.message_id;
  }
  await adapter.write(chatid, session);
  const job1 = new Cron('0 */5 * * * *', async () => {
    try {
      const session = await adapter.read(chatid);
      if (session == undefined || session.jxfwMgr == undefined || session.lastSentSubMsg == undefined) {
        throw Error("session not found")
      }
      await bot.api.editMessageText(chatid, session.lastSentSubMsg, await getCurriculum(session.jxfwMgr, "更新"), { parse_mode: "HTML"})
    } catch (e) {
      console.log(e)
    }
  });

  const job2 = new Cron('0 18 * * * *', async () => {
    try {
      const session = await adapter.read(chatid);
      if (session == undefined || session.jxfwMgr == undefined) {
        throw Error("session not found")
      }
      if (session.lastSentSubMsg != undefined) {
        await bot.api.deleteMessage(chatid, session.lastSentSubMsg);
      }
      const resp = await bot.api.sendMessage(chatid, await getCurriculum(session.jxfwMgr, "初始化"), { parse_mode: "HTML"});
      session.lastSentSubMsg = resp.message_id;
      await adapter.write(chatid, session);
    } catch(e) {
      console.log(e)
    }
  });

  jobs[chatid] = [job1, job2];
}

export async function rmCronJob(bot: Bot<MyContext>, adapter: FileAdapter<SessionData>, chatid: string) {
  try {
    const session = await adapter.read(chatid);
    if (session == undefined || session.jxfwMgr == undefined) {
      throw Error("session not found")
    }
    if (session == undefined || session.hasSub != true) {
      return;
    }
    if (session.lastSentSubMsg != undefined) {
      await bot.api.deleteMessage(chatid, session.lastSentSubMsg);
    }
    session.hasSub = false;
    session.lastSentSubMsg = undefined;
    await adapter.write(chatid, session);
    const [job1, job2] = jobs[chatid];
    job1.stop();
    job2.stop();
  } catch(e) {
   console.log(e)
  }
}