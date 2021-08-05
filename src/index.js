const puppeteer = require('puppeteer');

async function login(page, username, password) {
  await page.goto('https://thos.tsinghua.edu.cn/');
  await page.type('#i_user', username);
  await page.type('#i_pass', password);
  await page.click('.btn');
  await page.waitForTimeout(1500)
  const error = await page.$("#msg_note");
  if (error) {
    throw "用户名或密码错误";
  }
  await page.waitForSelector(".box[name='学生健康及出行情况报告']");
}

async function checkSubmitted(page) {
  let result = await page.evaluate(() => {
    let xhr = new XMLHttpRequest();
    xhr.open("post", "https://thos.tsinghua.edu.cn/fp/fp/myserviceapply/getBJSXList", false);
    xhr.setRequestHeader('content-type', 'application/json');
    xhr.send(JSON.stringify({"pageNum":"1","pageSize":"10"}))
    return JSON.parse(xhr.responseText)
  })
  if(!result.list) {
    return false;
  }
  const day = new Date(result.list[1].start_time).toLocaleDateString();
  const today = new Date().toLocaleDateString();
  return day === today;
}

async function submit(page) {
  await page.goto("https://thos.tsinghua.edu.cn/fp/view?m=fp#from=hall&" + 
  "serveID=b44e2daf-0ef6-4d11-a115-0eb0d397934f&act=fp/serveapply");
  await page.waitForSelector('#formIframe');
  let frame = page.frames().find(frame => frame.name() === "formIframe");
  if(!frame) {
    throw "未找到frame: formIframe,文件结构可能已改变!请到 https://github.com/rcy17/HealthReport 提一个issue～"
  }
  wait_seconds = 0
  while(true) {
    if (wait_seconds > 30) {
      throw "30s内未加载完成，已自动退出(请确定您此前提交过该表，因此详细地址非空)"
    }
    await page.waitForTimeout(1000);
    wait_seconds += 1
    let success = await frame.$eval("#MQXXSZ", (e) => e && e.value);
    if(success) {
      break
    }
  }
  await page.click("#commit")
  await page.waitForNavigation()
  await page.screenshot("33.png")
}


async function main(username, password) {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await login(page, username, password);
    let isSubmitted = await checkSubmitted(page);
    if(isSubmitted) {
      console.log("今天已经打卡过了");
    } else {
      await submit(page);
      isSubmitted = await checkSubmitted(page);
      await page.screenshot("log.png");
      if(!isSubmitted) {
        throw "本次打卡失败";
      }
      console.log("今日打卡成功");
    }
  } catch(error) {
    console.log(error)
  } finally {
    await browser.close();
  }
}

main("username", "password");
