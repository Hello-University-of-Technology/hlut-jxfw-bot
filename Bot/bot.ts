import {
  Bot,
  session,
} from "https://deno.land/x/grammy@v1.17.1/mod.ts";
import "https://deno.land/std@0.193.0/dotenv/load.ts";
import { JxfwMgr } from "../API/jxfwmgr.ts";
import { getCurriculum } from "../API/utils.ts";
import { MyContext,SessionData } from "./type.ts";
import { addCronJob, rmCronJob } from "../Utils/cron.ts";
import { FileAdapter } from "./file-adapter.ts";

const client = Deno.createHttpClient({
  // proxy: { url: "http://127.0.0.1:7890/" },
});

// 请在同目录下创建文件 .env 并写上 BOT_TOKEN=你的Bot token
const bot = new Bot<MyContext>(
  Deno.env.get("BOT_TOKEN") ?? "",
  {
    client: {
      baseFetchConfig: {
        // @ts-ignore: idk
        client,
      },
    },
  },
);

const adapter = new FileAdapter<SessionData>()

// @ts-ignore: idk
bot.use(session({ initial: () => ({}), storage: adapter}));

bot.command(
  "start",
  (ctx) => ctx.reply("`/login <学号> <密码>` 登录\n`/info <学年学期> <周次>` 获取该学年学期和周次的课表(如`/info 202202 5`代表2022年度第二学期第五周\n`/info` 获取当前课表", {parse_mode: "Markdown"}),
);

bot.command(
  "help",
  (ctx) => ctx.reply("`/login <学号> <密码>` 登录\n`/info <学年学期> <周次>` 获取该学年学期和周次的课表(如`/info 202202 5`代表2022年度第二学期第五周\n`/info` 获取当前课表", {parse_mode: "Markdown"}),
);

bot.command("sub", async (ctx) => {
  if (ctx.session.jxfwMgr == undefined || ctx.session.jxfwMgr.user == undefined) {
    ctx.reply("您尚未登录");
    return;
  }
  if (ctx.session.hasSub == true) {
    ctx.reply("您已经订阅过了");
    return;
  }
  ctx.session.hasSub = true;
  await addCronJob(bot, adapter, ctx.chat.id.toString())
  ctx.reply("订阅课表成功");
});

bot.command("unsub", async (ctx) => {
  if (ctx.session.jxfwMgr == undefined || ctx.session.jxfwMgr.user == undefined) {
    ctx.reply("您尚未登录");
    return;
  }
  if (ctx.session.hasSub != true) {
    ctx.reply("您当前不在订阅列表中");
    return;
  }
  await rmCronJob(bot, adapter, ctx.chat.id.toString())
  ctx.reply("取消订阅成功");
});


bot.command("login", async (ctx) => {
  if (ctx.message?.text.split(" ").length !== 3) {
    ctx.reply("参数：用户名 密码");
  } else {
    const [_, username, password] = ctx.message?.text.split(" ");
    try {
      ctx.session.jxfwMgr = new JxfwMgr(username, password);
      await ctx.session.jxfwMgr.login();
      ctx.reply("登录成功");
    } catch (error) {
      ctx.reply("教务登录错误：" + (error as Error).message);
    }
  }
});

bot.command("info", async (ctx) => {
  const mgr = ctx.session.jxfwMgr;
  if (mgr == undefined) {
    ctx.reply("您尚未登陆");
    return;
  }
  
  let xnxq = undefined, zc = undefined, _;
  if (ctx.message?.text.split(" ").length == 3) {
    [_, xnxq, zc] = ctx.message?.text.split(" ");
  }
  const ret = await getCurriculum(mgr, "初始化", xnxq, zc);
  
  ctx.reply(ret, { parse_mode: "HTML" });
});

// Handle other messages.
bot.on("message", (ctx) => {
  // ctx.reply(JSON.stringify(ctx));
});

bot.catch((e)=>{e.ctx.reply(e.message)})

// Start the bot.
bot.start();

const sessions = (await adapter.getSessions());
for(const key in sessions) {
  const data = sessions[key];
  if (data.hasSub == true) {
    await addCronJob(bot, adapter, key);
  }
}