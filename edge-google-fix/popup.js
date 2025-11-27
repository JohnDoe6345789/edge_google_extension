// Popup diagnostics for Bing → Google redirect.

const RULE_ID = 1;
const STORAGE_KEY_STATE = "debugState";
const STORAGE_KEY_LAST_REDIRECT = "lastRedirectedAt";

const ruleStatusEl = document.getElementById("rule-status");
const lastRedirectEl = document.getElementById("last-redirect");
const lastActionEl = document.getElementById("last-action");
const lastResultEl = document.getElementById("last-result");
const lastErrorEl = document.getElementById("last-error");
const sourceUrlEl = document.getElementById("source-url");
const targetUrlEl = document.getElementById("target-url");
const deepCheckBtn = document.getElementById("deep-check");
const deepCheckResult = document.getElementById("deep-check-result");
const hintsEl = document.getElementById("hints");
const platformEl = document.getElementById("platform");

function setStatusElement(el, text, cls) {
  el.textContent = text;
  el.className = cls || "";
}

function loadRuleStatus() {
  chrome.declarativeNetRequest.getDynamicRules((rules) => {
    const rule = rules.find((r) => r.id === RULE_ID);
    if (rule) {
      setStatusElement(ruleStatusEl, "Active", "ok");
    } else {
      setStatusElement(ruleStatusEl, "Missing", "bad");
    }
  });
}

function loadDebugState() {
  chrome.storage.local.get([STORAGE_KEY_STATE, STORAGE_KEY_LAST_REDIRECT], (data) => {
    const state = data[STORAGE_KEY_STATE] || {};
    const lastRedirectAt = data[STORAGE_KEY_LAST_REDIRECT];

    if (lastRedirectAt) {
      const d = new Date(lastRedirectAt);
      setStatusElement(lastRedirectEl, d.toLocaleString(), "");
    } else {
      setStatusElement(lastRedirectEl, "Never", "warn");
    }

    const action = state.lastAction || "None";
    const result = state.lastResult || "Unknown";
    const error = state.lastError || "None";

    let resultClass = "";
    if (result === "success") resultClass = "ok";
    else if (result === "error") resultClass = "bad";
    else resultClass = "warn";

    setStatusElement(lastActionEl, action, "");
    setStatusElement(lastResultEl, result, resultClass);
    setStatusElement(lastErrorEl, error, error === "None" ? "" : "bad");

    sourceUrlEl.textContent = state.lastSourceUrl || "–";
    targetUrlEl.textContent = state.lastTargetUrl || "–";

    // Basic hints based on state.
    const hints = [];
    if (!lastRedirectAt) {
      hints.push(
        "No Bing search pages have been seen yet. If you have already searched from the address bar, check that 'Allow access to search page results' is enabled on the extension details page."
      );
    }
    if (result === "error" && error.includes("tabs.update")) {
      hints.push(
        "tabs.update failed. This can happen if the tab was closed or updated before the redirect ran."
      );
    }
    if (result === "error" && error.includes("declarativeNetRequest")) {
      hints.push(
        "There was a problem with the declarativeNetRequest API. Edge may be limiting rules on search pages."
      );
    }

    hintsEl.textContent = hints.join(" ");
  });
}

function runDeepCheck() {
  deepCheckResult.textContent = "Running deep self-check…";

  chrome.declarativeNetRequest.getDynamicRules((rules) => {
    const rule = rules.find((r) => r.id === RULE_ID);
    const steps = [];

    if (rule) {
      steps.push("Step 1: Dynamic redirect rule is installed.");
    } else {
      steps.push(
        "Step 1: Dynamic redirect rule is missing. Try toggling the extension off and on."
      );
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        steps.push("Step 2: Could not query active tab: " + chrome.runtime.lastError.message);
        deepCheckResult.textContent = steps.join(" ");
        return;
      }

      const tab = tabs[0];
      if (!tab) {
        steps.push("Step 2: No active tab found.");
        deepCheckResult.textContent = steps.join(" ");
        return;
      }

      steps.push("Step 2: Active tab URL is: " + (tab.url || "about:blank"));

      try {
        const url = new URL(tab.url || "about:blank");
        const isBing =
          url.hostname === "www.bing.com" || url.hostname === "cn.bing.com";
        if (isBing) {
          steps.push("Step 3: Active tab is a Bing page.");
        } else {
          steps.push("Step 3: Active tab is not a Bing page; redirect only applies when Edge sends you to Bing.");
        }
      } catch (e) {
        steps.push("Step 3: Could not parse active tab URL.");
      }

      deepCheckResult.textContent = steps.join(" ");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadRuleStatus();
  loadDebugState();

  chrome.runtime.getPlatformInfo((info) => {
    platformEl.textContent = `Platform: ${info.os}, Arch: ${info.arch}`;
  });

  deepCheckBtn.addEventListener("click", runDeepCheck);
});
