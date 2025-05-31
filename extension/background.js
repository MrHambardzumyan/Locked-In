let activeTab = null;
let startTime = null;
const trackedData = {}; // Stores { domain: { academic: time, entertainment: time, social: time, uncategorized: time } }

// Default hardcoded categories for initial categorization
const categories = {
  academic: [
    "wikipedia.org", "stackoverflow.com", "github.com", ".edu", "scholar.google.com",
    "coursera.org", "udemy.com", "khanacademy.org", "jupyter.org", "researchgate.net"
  ],
  entertainment: [
    "youtube.com", "netflix.com", "hulu.com", "disneyplus.com", "primevideo.com",
    "spotify.com", "twitch.tv", "reddit.com", "ign.com", "gamespot.com"
  ],
  social_media: [
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com",
    "snapchat.com", "pinterest.com", "tumblr.com", "discord.com", "mastodon.social"
  ]
};

// Helper function to extract the main domain from a URL hostname
function getDomain(hostname) {
  const parts = hostname.split('.');
  // Handle cases like "www.example.com" or "sub.domain.example.com"
  if (parts.length > 2 && parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length <= 3) {
    // Likely a TLD like co.uk or com.au
    return parts.slice(parts.length - 3).join('.').toLowerCase();
  }
  return parts.slice(parts.length - 2).join('.').toLowerCase();
}

// Categorizes a given URL based on predefined keywords
function categorizeUrl(url) {
  try {
    const domain = getDomain(new URL(url).hostname);
    // Check user-defined categories first
    for (const category in userCategories) {
      if (userCategories[category].includes(domain)) {
        return category;
      }
    }
    // Fallback to hardcoded categories if not found in user categories
    for (const category in categories) {
      for (const keyword of categories[category]) {
        if (url.includes(keyword)) {
          return category;
        }
      }
    }
  } catch (e) {
    console.warn("Could not categorize URL:", url, e);
  }
  return "uncategorized";
}

// Load previous time tracking data on startup
chrome.storage.local.get(['websiteTimeData'], function(result) {
  if (result.websiteTimeData) {
    Object.assign(trackedData, result.websiteTimeData);
  }
  console.log("Loaded time tracking data:", trackedData);
});

// Save current time tracking data to local storage
function saveTrackedData() {
  chrome.storage.local.set({
    websiteTimeData: trackedData
  }, function() {
    // console.log("Time tracking data saved:", trackedData);
  });
}

let entertainmentNotified = false;

// Check if entertainment limit is reached and send a notification
function checkEntertainmentLimitBG() {
  chrome.storage.local.get(['entertainmentLimit', 'websiteTimeData'], function(result) {
    if (result.entertainmentLimit && result.websiteTimeData) {
      let entertainmentMs = 0;
      for (const domain in result.websiteTimeData) {
        entertainmentMs += result.websiteTimeData[domain].entertainment || 0;
      }
      const limitMs = result.entertainmentLimit * 60 * 1000;
      if (entertainmentMs >= limitMs && !entertainmentNotified) {
        entertainmentNotified = true;
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'Entertainment Limit Reached!',
          message: "You've reached your entertainment limit! Get back to work."
        });
      }
      if (entertainmentMs < limitMs) {
        entertainmentNotified = false; // Reset if user goes below limit
      }
    }
  });
}

// Update time spent on the active tab
function updateTime() {
  if (activeTab && startTime) {
    try {
      if (!activeTab.url || typeof activeTab.url !== "string" || !activeTab.url.startsWith("http")) {
        return;
      }
      const timeSpent = Date.now() - startTime;
      const domain = getDomain(new URL(activeTab.url).hostname);
      const category = categorizeUrl(activeTab.url);

      if (!trackedData[domain]) {
        trackedData[domain] = {
          academic: 0,
          entertainment: 0,
          social_media: 0,
          uncategorized: 0
        };
      }

      trackedData[domain][category] += timeSpent;
      // console.log(`Tracked ${timeSpent / 1000}s on ${domain} as ${category}`);
      saveTrackedData();

      // Entertainment limit check
      checkEntertainmentLimitBG();

      // Reset startTime after logging
      startTime = Date.now();
    } catch (e) {
      console.warn("Invalid URL in updateTime:", activeTab.url, e);
    }
  }
}

// Track tab switches
chrome.tabs.onActivated.addListener(function(activeInfo) {
  updateTime();
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab) {
      activeTab = tab;
      startTime = Date.now();
      // console.log("Active tab:", activeTab.url);
    }
  });
});

// Track tab URL changes
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (tab.active && changeInfo.url && activeTab && tabId === activeTab.id) {
    updateTime();
    activeTab = tab;
    startTime = Date.now();
    // console.log("Tab updated and active:", activeTab.url);
  }
});

// Track window focus changes
chrome.windows.onFocusChanged.addListener(function(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    updateTime();
    activeTab = null;
    startTime = null;
    console.log("Chrome lost focus");
  } else {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) {
      if (tabs.length > 0) {
        updateTime();
        activeTab = tabs[0];
        startTime = Date.now();
        console.log("Chrome gained focus, active tab:", activeTab.url);
      }
    });
  }
});

// Initial setup when extension starts
chrome.tabs.query({
  active: true,
  currentWindow: true
}, function(tabs) {
  if (tabs.length > 0) {
    activeTab = tabs[0];
    startTime = Date.now();
    console.log("Initial active tab:", activeTab.url);
  }
});

// Track tab closures
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  updateTime();
  activeTab = null;
  startTime = null;
});

// Periodic time update to ensure continuous tracking
setInterval(() => {
  updateTime(); // Will log and reset startTime
}, 10000); // every 10 seconds

// ---- FINAL RESET LOGIC ----
chrome.windows.onRemoved.addListener(function(windowId) {
  updateTime();
  chrome.windows.getAll({}, function(windows) {
    if (windows.length === 0) {
      chrome.storage.local.get(['resetPending'], function(result) {
        if (result.resetPending) {
          // Clear in-memory trackedData as well as storage
          for (const key in trackedData) delete trackedData[key];
          chrome.storage.local.set({ websiteTimeData: {}, resetPending: false });
          console.log("websiteTimeData cleared after all windows closed due to resetPending flag.");
        }
      });
    }
  });
});

// (Optional safety) On startup, clear if resetPending is still set
chrome.runtime.onStartup.addListener(function() {
  chrome.storage.local.get(['resetPending'], function(result) {
    if (result.resetPending) {
      for (const key in trackedData) delete trackedData[key];
      chrome.storage.local.set({ websiteTimeData: {}, resetPending: false });
      console.log("websiteTimeData cleared on startup due to resetPending flag.");
    }
  });
});


// ---- WEBSITE BLOCKING LOGIC ----
let blockedSites = []; // Stores { name: "domain.com", timer: 30 } (timer in minutes, 0 for indefinite)
let userCategories = {}; // Loaded from storage, used by categorizeUrl

// Load blocked sites and user categories on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['blockedSites'], (result) => {
    blockedSites = result.blockedSites || [];
    console.log("Loaded blocked sites:", blockedSites);
  });
  chrome.storage.local.get(['userCategories'], function(result) {
    userCategories = result.userCategories || {};
    console.log("Loaded user categories:", userCategories);
  });
});

// Listen for messages from popup.js or blocked.html
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getBlockedSites") {
    sendResponse({ blockedSites: blockedSites });
  } else if (request.action === "addBlockedSite") {
    const domain = getDomain(request.domain);
    const timer = request.timer; // in minutes
    if (!blockedSites.some(site => getDomain(site.name) === domain)) {
      blockedSites.push({ name: domain, timer: timer });
      chrome.storage.sync.set({ blockedSites: blockedSites }, () => {
        sendResponse({ success: true, message: `${domain} added to blocked sites.` });
      });
    } else {
      sendResponse({ success: false, message: `${domain} is already blocked.` });
    }
    return true; // Keep the message channel open for sendResponse
  } else if (request.action === "removeBlockedSite") {
    const domainToRemove = getDomain(request.domain);
    const initialLength = blockedSites.length;
    blockedSites = blockedSites.filter(site => getDomain(site.name) !== domainToRemove);
    if (blockedSites.length < initialLength) {
      chrome.storage.sync.set({ blockedSites: blockedSites }, () => {
        sendResponse({ success: true, message: `${domainToRemove} removed from blocked sites.` });
      });
    } else {
      sendResponse({ success: false, message: `${domainToRemove} was not found in blocked sites.` });
    }
    return true;
  } else if (request.action === "unblockSiteAfterTimer") {
    const domainToUnblock = getDomain(request.domain);
    const initialLength = blockedSites.length;
    blockedSites = blockedSites.filter(site => getDomain(site.name) !== domainToUnblock);
    if (blockedSites.length < initialLength) {
      chrome.storage.sync.set({ blockedSites: blockedSites }, () => {
        console.log(`${domainToUnblock} unblocked automatically after timer.`);
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, message: `${domainToUnblock} not found for unblock.` });
    }
    return true;
  } else if (request.action === "updateUserCategories") {
    userCategories = request.userCategories;
    chrome.storage.local.set({ userCategories: userCategories }, () => {
      console.log("User categories updated in background:", userCategories);
      sendResponse({ success: true });
    });
    return true;
  }
});

// Listen for navigation attempts
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Only consider the main frame
    try {
      const url = new URL(details.url);
      const currentDomain = getDomain(url.hostname);

      // Check if the current domain is in the blockedSites list
      const isBlocked = blockedSites.some(site => getDomain(site.name) === currentDomain);

      if (isBlocked) {
        // Redirect to the blocked page, passing the original URL as a query parameter
        const blockedPageUrl = chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(currentDomain)}&originalUrl=${encodeURIComponent(details.url)}`);
        chrome.tabs.update(details.tabId, { url: blockedPageUrl });
      }
    } catch (e) {
      console.error("Error processing navigation:", e);
    }
  }
});

// Ensure userCategories are loaded when the service worker starts
chrome.storage.local.get(['userCategories'], function(result) {
  userCategories = result.userCategories || {};
});
