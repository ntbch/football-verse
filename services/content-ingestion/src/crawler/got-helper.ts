let gotScrapingInstance: any = null;

export async function getGotScraping(): Promise<any> {
  if (!gotScrapingInstance) {
    const module = await (eval("import('got-scraping')") as Promise<any>);
    gotScrapingInstance = module.gotScraping;
  }
  return gotScrapingInstance;
}
