import encryptPassword from "../crypto.js";



async function getLoginData(authURL: string | URL | Request) {
  const resp = await fetch(authURL);
  const respHTML = await resp.text();

  return ({
    getLoginParams: (username: string, password: string) => {
      return {
        username: username,
        password: encryptPassword(
          password,
          /<input type="hidden" id="pwdEncryptSalt" value="(\S+)" ?\/?>/.exec(
            respHTML,
          )![1],
        ) as string,
        captcha: "",
        _eventId: "submit",
        lt: "",
        cllt: "userNameLogin",
        dllt: "generalLogin",
        execution:
          /<input type="hidden" name="execution" value="(\S+)" ?\/?>/.exec(
            respHTML,
          )![1],
      };
    },
    authHeaders: {
      "Accept": "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "Host": "authserver.gdut.edu.cn",
      "Origin": "https://authserver.gdut.edu.cn",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36",
      "Cookie": resp.headers.get("set-cookie")!,
    },
  });
}

export async function getLoginSSOResponse(
  authURL: string | URL | Request,
  username: string | number,
  password: string,
) {
  const data = await getLoginData(authURL);
  return await fetch(authURL, {
    method: "POST",
    headers: data.authHeaders,
    body: new URLSearchParams(
      data.getLoginParams(username.toString(), password),
    ),
    redirect: "manual",
  });
}

export async function ssoLoginForTokenURL(
  username: string | number,
  password: string,
  authURL =
    "https://authserver.gdut.edu.cn/authserver/login?service=http%3A%2F%2Fjxfw.gdut.edu.cn%2Fnew%2FssoLogin",
) {
  const authResponse = await getLoginSSOResponse(authURL, username, password);
  const tokenURL = authResponse.headers.get("Location");
  if (tokenURL) {
    return tokenURL;
  } else {
    const errorMessage = /<span id="showErrorTip"><span>(.+)<\/span><\/span>/g
      .exec(
        await authResponse.text(),
      )?.[1];
    throw Error(errorMessage ?? "SSO 登录失败，未知错误");
  }
}

export interface CourseScheduleJSON {
  /** 节次代码 example: '01,02' */
  jcdm2: string;
  /** 教学班名称 */
  jxbmc: string;
  /** 教学场地名称 */
  jxcdmcs: string;
  /** 课程编号 */
  kcbh: string;
  /** 课程名称 */
  kcmc: string;
  /** 课程任务代码 */
  kcrwdm: string;
  /** 教师姓名 */
  teaxms: string;
  /** 星期 */
  xq: string;
  /** 周次 */
  zcs: string;
}

export async function jxfwLogin(
  jxfwTokenURL: string | URL | Request,
) {
  if (typeof jxfwTokenURL === "string" && jxfwTokenURL.startsWith("http://")) {
    jxfwTokenURL = jxfwTokenURL.replace("http://", "https://");
  } else if (jxfwTokenURL instanceof URL) {
    jxfwTokenURL.protocol = "https:";
  }
  const jxfwLoginResponse = await fetch(jxfwTokenURL, {
    redirect: "manual",
  });
  const jxfwssoLoginResp = await fetch(
    jxfwLoginResponse.headers.get("Location")!.replace("http://", "https://"),
    {
      headers: {
        "Cookie": jxfwLoginResponse.headers.get("Set-Cookie")!,
        "Referer": "https://jxfw.gdut.edu.cn/",
      },
      redirect: "manual",
    },
  );
  if (
    jxfwssoLoginResp.headers.get("Location") !==
      "https://jxfw.gdut.edu.cn/login!welcome.action"
  ) {
    console.log(
      "Warning: JXFW login not redirect to main page",
      jxfwssoLoginResp.headers.get("Location"),
    );
  }
  const cookies = jxfwLoginResponse.headers.get("Set-Cookie");
  if (cookies) {
    return cookies;
  } else {
    throw Error("没有返回 Cookies, 未知错误");
  }
}

export function getJxfwXHRHeaders(cookies: string) {
  return [
    ["Cookie", cookies],
    ["Referer", "jxfw.gdut.edu.cn"],
  ];
}


/**
 * @returns cookies 有效性
 */
export async function validateCookies(cookies: string) {
  const testRequest = await fetch(
    "https://jxfw.gdut.edu.cn/xstccjxx!getDataList.action",
    {
      headers: {
        "Cookie": cookies,
        "Referer": "jxfw.gdut.edu.cn",
      },
      "body": "page=1&rows=50&sort=xnxqdm&order=asc",
      "method": "POST",
    },
  );
  const c = await testRequest.body?.getReader().read();
  if (c?.value?.at(0) === 123) {
    return true;
  } else {
    return false;
  }
}

/**
 * 学生个人学期课表 API
 * @param xnxqdm 学年学期代码
 */
export async function xsAllKbList(
  jxfwHeaders: HeadersInit,
  xnxqdm: string | number,
): Promise<CourseScheduleJSON[]> {
  const htmlPage = await (await fetch(
    "https://jxfw.gdut.edu.cn/xsgrkbcx!xsAllKbList.action?xnxqdm=" +
      xnxqdm.toString(),
    {
      headers: jxfwHeaders,
    },
  )).text();
  return JSON.parse(htmlPage.match(/var kbxx = (\[.*?]);/)![1]);
}

/**
 * 学生按周课表 API
 * @param jxfwHeaders JXFW 登录后的 headers
 * @param zc 周次
 * @param xnxqdm 学年学期代码
 */
export async function getKbRq(
  jxfwHeaders: HeadersInit,
  zc: string | number,
  xnxqdm: string | number,
) {
  return await (await fetch(
    `https://jxfw.gdut.edu.cn/xsgrkbcx!getKbRq.action?zc=${zc}&xnxqdm=${xnxqdm}`,
    {
      headers: jxfwHeaders,
    },
  )).json();
}

/**
 * @param jxfwHeaders JXFW 登录后的 headers
 * @param xnxqdm 学年学期代码
 * @returns 该学期的第一天
 */
export async function getFirstDayInSemester(
  jxfwHeaders: HeadersInit,
  xnxqdm: string | number,
) {
  const firstWeekDay = (await getKbRq(jxfwHeaders, "1", xnxqdm))[1] as Array<
    { xqmc: string; rq: string }
  >;
  return new Date(firstWeekDay.find((day) => day.xqmc === "1")!.rq);
}

export interface 上课详细信息 {
  /** 代管课室代码 */ dgksdm: string;
  /** 课表代码 */ kbdm: string;
  /** 课程编号 */ kcbh: string;
  /** 课程名称 */ kcmc: string;
  /** 教师姓名 */ teaxms: string;
  /** 教学班代码 */ jxbdm: string;
  /** 学年学期代码 */ xnxqdm: string;
  /** 教学班名称 */ jxbmc: string;
  /** 周次 */ zc: string;
  /** 节次代码 */ jcdm: string;
  /** 节次代码以,分开 */ jcdm2: string;
  /** 星期 */ xq: string;
  /** 教学场地名称 */ jxcdmc: string;
  /** 上课内容简介 */ sknrjj: string;
  /** 教师代码 */ teadms: string;
  /** 教学场地代码 */ jxcddm: string;
  /** 课程代码 */ kcdm: string;
  /** 总学时 */ zxs: string;
  /** 学时 */ xs: string;
  /** 排课人数 */ pkrs: string;
  /** 课序号 */ kxh: string;
  /** 分类分组名称 */ flfzmc: string;
  /** 教学环节名称 */ jxhjmc: string;
  /** 推课标志 */ tkbz: string;
}

export interface 一周日期 {
     /** 星期名称 */xqmc: string,
      /** 日期 */ rq: string
}
