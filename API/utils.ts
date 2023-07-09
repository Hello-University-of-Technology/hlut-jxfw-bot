import { hhmm,jc_to_date,tdt_to_str } from "../Utils/date.ts";
import { JxfwMgr } from "./jxfwmgr.ts";
import { 上课详细信息 } from "./raw.ts";

export 
async function getCurriculum(mgr: JxfwMgr, text: "初始化"|"更新", xnxq: string | undefined = undefined, zc: string | undefined = undefined) {
  Object.setPrototypeOf(mgr, JxfwMgr.prototype);
  if (xnxq == undefined || zc == undefined) {
    [xnxq, zc] = await mgr.获取当前学年学期代码和周次();
  }
  const 一周课表 = zc != '' ? (await mgr.获取一周课表和日期(xnxq, zc)).一周课表 : [];
  const now = new Date();
  const day = now.getDay();
  const nowhm = hhmm(now.getHours(), now.getMinutes()).getTime();

  const stringify = (x: 上课详细信息) => {
    // 86400000 = 1000 * 60 * 60 * 24 一天的毫秒数
    const courseBeginTime = (parseInt(x.xq) - day) * 86400000
               + jc_to_date(parseInt(x.jcdm.slice(0, 2))).getTime();
    const delta =  courseBeginTime - nowhm;
    if (delta < 0) {
      return `<tg-spoiler><del>${x.xq} ${x.jcdm} ${x.kcmc} ${x.jxcdmc}</del></tg-spoiler>`;
    } else {
      // 若 今天的星期几 == 课程的星期几，即为当日课程，将序号用中括号括起
      // 若 距离该堂课上课的时间 > 1 day，则不显示距离时间
      return `<code>${parseInt(x.xq) == day ? `![${x.xq}]` : x.xq} ${x.jcdm}</code> <b>${x.kcmc}</b> ${x.jxcdmc}${
        delta < 86400000 ? ` (${tdt_to_str(delta)})` : ''
      }`;
    }
  };
  let ret = `<b>${xnxq.slice(0, 4)} 学年第 ${xnxq.slice(5, 6)} 学期 ${
    zc != "" ? `第 ${zc} 周` : "假期"
  }</b>`;
  ret += "\n\n" + 一周课表.map(stringify).sort().join("\n");
  ret += `\n\n${text}于: <i>${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}</i>`
  return ret;
}