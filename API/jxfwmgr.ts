import * as Raw from "./raw.ts"
import { 上课详细信息, 一周日期 } from "./raw.ts";

function getInit(cookies: string) {
  return     {
    "headers": Raw.getJxfwXHRHeaders(cookies),
    "method": "GET",
  };
}

export class JxfwMgr {
  user: string
  pwd: string
  cookies = ''

  constructor(user: string, pwd: string) {
    this.user = user;
    this.pwd = pwd;
  }

  async getJsonWithId(input: string | URL | Request) {
    const ret = await (await fetch(input, getInit(this.cookies))).text();
    if (ret.search('DOCTYPE') != -1) {
      await this.login()
      return await (await fetch(input, getInit(this.cookies),)).json();
    } else {
      return JSON.parse(ret);
    }
  }

  async getTextWithId(input: string | URL | Request) {
    const ret = await (await fetch(input, getInit(this.cookies))).text();
    if (ret.search('DOCTYPE') != -1) {
      await this.login()
      return await (await fetch(input, getInit(this.cookies))).text();
    } else {
      return ret;
    }
  }

  async login() {
    if (this.cookies != '' && await Raw.validateCookies(this.cookies)) {
      return this.cookies;
    }
    const tokenURL = await Raw.ssoLoginForTokenURL(this.user, this.pwd);
    const cookies = await Raw.jxfwLogin(tokenURL);
    if (cookies !== null && await Raw.validateCookies(cookies)) {
      this.cookies = cookies;
      return this.cookies;
    } else {
      throw Error("错误：统一认证登录教务失败");
    }
  }

  async 获取一周课表和日期(
    学年学期代码: string,
    周次: string,
  ) {
    const [一周上课详细信息, 一周日期] = await (this.getJsonWithId(
      `https://jxfw.gdut.edu.cn/xsgrkbcx!getKbRq.action?xnxqdm=${学年学期代码}&zc=${周次}`,

    ));
    return {
      "一周课表": 一周上课详细信息 as 上课详细信息[],
      "一周日期": 一周日期 as 一周日期[],
    };
  }

  /**
  * @returns 返回一个数组 [学年学期代码, 周次]
  */
  async 获取当前学年学期代码和周次() {
    const re =
      /'xsgrkbcx!getQxkbList\.action\?xnxqdm=(\d+)&zc=(\d*)&firstquery=true'\)/g;
    const htmlwithinfo =
      await this.getTextWithId("https://jxfw.gdut.edu.cn/xsgrkbcx!xsgrkbMain.action",);
    const match = re.exec(htmlwithinfo);
    if (match) {
      const [_, xnxqdm, zc] = match;
      return [xnxqdm, zc];
    } else {
      throw Error("解析 /xsgrkbcx!xsgrkbMain.action 获取当前学期代码和周次失败");
    }
  }
}