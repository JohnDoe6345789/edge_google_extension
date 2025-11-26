const RULE_ID = 1;

const ruleStatusEl = document.getElementById("rule-status");
const lastRedirectEl = document.getElementById("last-redirect");
const selfCheckBtn = document.getElementById("self-check");
const selfCheckResult = document.getElementById("self-check-result");
const detailsEl = document.getElementById("details");

function setRuleStatus(text, ok) {
  ruleStatusEl.textContent = text;
  ruleStatusEl.className = ok ? "ok" : "bad";
}

function loadRuleStatus() {
  chrome.declarativeNetRequest.getDynamicRules((rules) => {
    const rule = rules.find((r) => r.id === RULE_ID);
    if (rule) {
      setRuleStatus("Active", true);
    } else {
      setRuleStatus("Missing", false);
    }
  });
}

function loadLastRedirect() {
  chrome.storage.local.get("lastRedirectedAt", (data) => {
    if (data.lastRedirectedAt) {
      const d = new Date(data.lastRedirectedAt);
      lastRedirectEl.textContent = d.toLocaleString();
    } else {
      lastRedirectEl.textContent = "Never";
    }
  });
}

function runSelfCheck() {
  selfCheckResult.textContent = "Running self-check…";
  chrome.declarativeNetRequest.getDynamicRules((rules) => {
    const rule = rules.find((r) => r.id === RULE_ID);
    if (!rule) {
      selfCheckResult.textContent =
        "Redirect rule is missing. Try turning the extension off and back on.";
      return;
    }
    selfCheckResult.textContent =
      "Redirect rule is installed. Try searching something in the address bar; this popup will update the last redirect time once Bing is hit.";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadRuleStatus();
  loadLastRedirect();

  chrome.runtime.getPlatformInfo((info) => {
    detailsEl.textContent = `Platform: ${info.os}, Arch: ${info.arch}`;
  });

  selfCheckBtn.addEventListener("click", runSelfCheck);
});
