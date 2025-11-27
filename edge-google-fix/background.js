// Background service worker for Bing → Google redirect with debug state.

const RULE_ID = 1;
const STORAGE_KEY_STATE = "debugState";
const STORAGE_KEY_LAST_REDIRECT = "lastRedirectedAt";

function saveDebugState(patch) {
  chrome.storage.local.get(STORAGE_KEY_STATE, (data) => {
    const current = data[STORAGE_KEY_STATE] || {};
    const next = { ...current, ...patch };
    chrome.storage.local.set({ [STORAGE_KEY_STATE]: next });
  });
}

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
        saveDebugState({
          lastRuleStatus: "install_error",
          lastRuleError: chrome.runtime.lastError.message || String(chrome.runtime.lastError),
          lastRuleUpdatedAt: Date.now()
        });
      } else {
        console.log("Bing → Google redirect rule installed.");
        saveDebugState({
          lastRuleStatus: "installed",
          lastRuleError: null,
          lastRuleUpdatedAt: Date.now()
        });
      }
    }
  );
}

function extractSearchQuery(urlObj) {
  // Fuzzy extraction of the search query: try several common parameter names.
  const candidates = ["q", "Q", "query", "text"];
  for (const key of candidates) {
    const value = urlObj.searchParams.get(key);
    if (value && value.trim().length > 0) {
      return value;
    }
  }
  return "";
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
      const isBingHost =
        url.hostname === "www.bing.com" || url.hostname === "cn.bing.com";
      const isSearchPath =
        url.pathname === "/search" || url.pathname === "/";

      if (isBingHost && isSearchPath) {
        const query = extractSearchQuery(url);
        const target = new URL("https://www.google.com/search");
        if (query) {
          target.searchParams.set("q", query);
        }

        const debugPayload = {
          lastEventAt: Date.now(),
          lastSourceUrl: details.url,
          lastTargetUrl: target.toString(),
          lastAction: "redirect_attempted",
          lastResult: null,
          lastError: null,
          lastTabId: details.tabId
        };

        // Record that we saw a Bing search page (even if redirect fails).
        chrome.storage.local.set({ [STORAGE_KEY_LAST_REDIRECT]: Date.now() });
        saveDebugState(debugPayload);

        chrome.tabs.update(details.tabId, { url: target.toString() }, () => {
          if (chrome.runtime.lastError) {
            console.error("tabs.update redirect failed:", chrome.runtime.lastError);
            saveDebugState({
              lastResult: "error",
              lastError:
                chrome.runtime.lastError.message ||
                String(chrome.runtime.lastError)
            });
          } else {
            console.log("Imperative redirect Bing → Google applied:", target.toString());
            saveDebugState({
              lastResult: "success",
              lastError: null
            });
          }
        });
      }
    } catch (e) {
      console.error("Error in webNavigation listener:", e);
      saveDebugState({
        lastEventAt: Date.now(),
        lastAction: "exception",
        lastResult: "error",
        lastError: String(e)
      });
    }
  },
  {
    url: [
      { hostEquals: "www.bing.com" },
      { hostEquals: "cn.bing.com" }
    ],
    types: ["main_frame"]
  }
);
