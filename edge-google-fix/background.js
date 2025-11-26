const RULE_ID = 1;

function installRedirectRule() {
  chrome.declarativeNetRequest.updateDynamicRules(
    {
      removeRuleIds: [RULE_ID],
      addRules: [
        {
          id: RULE_ID,
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              transform: {
                scheme: "https",
                host: "www.google.com"
              }
            }
          },
          condition: {
            urlFilter: "bing.com/search",
            resourceTypes: ["main_frame"]
          }
        }
      ]
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error("Failed to install redirect rule:", chrome.runtime.lastError);
      } else {
        console.log("Bing → Google redirect rule installed.");
      }
    }
  );
}

chrome.runtime.onInstalled.addListener(() => {
  installRedirectRule();
});

chrome.runtime.onStartup.addListener(() => {
  installRedirectRule();
});

chrome.webNavigation.onCommitted.addListener(
  (details) => {
    try {
      const url = new URL(details.url);
      if (
        (url.hostname === "www.bing.com" || url.hostname === "cn.bing.com") &&
        url.pathname === "/search"
      ) {
        chrome.storage.local.set({ lastRedirectedAt: Date.now() });
      }
    } catch (e) {
      console.error("Error parsing URL in webNavigation listener:", e);
    }
  },
  {
    url: [
      { hostEquals: "www.bing.com", pathEquals: "/search" },
      { hostEquals: "cn.bing.com", pathEquals: "/search" }
    ],
    types: ["main_frame"]
  }
);
