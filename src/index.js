const puppeteer = require('puppeteer');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function login(page, username, password) {
  await page.goto('https://thos.tsinghua.edu.cn/');
  await page.type('#i_user', username);
  await page.type('#i_pass', password);
  await page.click('.btn');
  await page.waitForNavigation();
  const error = await page.$("#msg_note");
  if (error) {
    throw "!用户名或密码错误";
  }
  await page.waitForSelector(".box[name='学生健康及出行情况报告']");
}

async function checkSubmitted(page) {
  let result = await page.evaluate(() => {
    let xhr = new XMLHttpRequest();
    xhr.open("post", "https://thos.tsinghua.edu.cn/fp/fp/myserviceapply/getBJSXList", false);
    xhr.setRequestHeader('content-type', 'application/json');
    xhr.send(JSON.stringify({ "pageNum": "1", "pageSize": "10" }))
    return JSON.parse(xhr.responseText)
  })
  if (!result.list) {
    return false;
  }
  const day = new Date(result.list[0].start_time).toLocaleDateString();
  const today = new Date().toLocaleDateString();
  return day === today;
}

async function submit(page) {
  await page.goto("https://thos.tsinghua.edu.cn/fp/view?m=fp#from=hall&" +
    "serveID=b44e2daf-0ef6-4d11-a115-0eb0d397934f&act=fp/serveapply");
  await page.waitForSelector('#formIframe');
  let frame = page.frames().find(frame => frame.name() === "formIframe");
  if (!frame) {
    throw "!未找到frame: formIframe,文件结构可能已改变!请到 https://github.com/rcy17/HealthReport/issues 提一个issue～"
  }
  const element = await frame.waitForSelector("#MQXXSZ");
  // 如果 20s 内加载不出来说明此前没填过详细地址
  await frame.waitForFunction((e) => e.value, { timeout: 20000 }, element);
  await page.click("#commit");
  await page.waitForNavigation();
}


async function work(username, password) {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await login(page, username, password);
    let isSubmitted = await checkSubmitted(page);
    if (isSubmitted) {
      console.log("今天已经打卡过了");
    } else {
      await submit(page);
      isSubmitted = await checkSubmitted(page);
      await page.screenshot("log.png");
      if (!isSubmitted) {
        throw "本次打卡失败";
      }
      console.log("今日打卡成功");
    }
  } finally {
    await browser.close();
  }
}

async function main(username, password, interval) {
  let nextTime = new Date();
  while (true) {
    const delta = (nextTime - new Date());
    if (delta > 0) {
      await delay(delay);
      continue;
    }
    try {
      await work(username, password);
    } catch (error) {
      console.log((new Date()).toLocaleString(), error);
      if (error[0] === '!') {
        break;
      }
      // wait for 10 second
      await delay(10000);
      continue;
    }
    nextTime.setDate(nextTime.getDate() + 1);
    nextTime.setHours(7);
    nextTime.setMinutes(0);
    nextTime.setSeconds(Math.floor(Math.random() * interval * 60));
    console.log("计划下次打卡时间：", nextTime.toLocaleString());
  }
}

const argv = require('minimist')(process.argv.slice(2));
const username = argv.u ?? argv.username;
const password = argv.p ?? argv.password;
const interval = parseInt(argv.i ?? argv.interval ?? 180);
if (!username) {
  throw "username is required";
}
if (!password) {
  throw "password is required";
}
if (isNaN(interval) || interval < 0) {
  throw "interval must be a positive inter"
}
console.log("username: ", username);
console.log("password:", password);
console.log("random interval: ", interval);
main(username, password, interval);
