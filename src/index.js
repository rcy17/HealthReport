const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://thos.tsinghua.edu.cn/');
  await page.type('#i_user', "rcy17")
  await page.type('#i_pass', "present52None")
  await page.click('.btn')
  await page.screenshot({ path: 'example.png' });

  await browser.close();
})();