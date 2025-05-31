document.addEventListener('DOMContentLoaded', function() {
  const websiteList = document.getElementById('websiteList');
  const categoryChartCanvas = document.getElementById('categoryChart');
  const categoryList = document.getElementById('categoryList');
  const blockDomainInput = document.getElementById('blockDomainInput');
  const blockTimerSelect = document.getElementById('blockTimerSelect');
  const addBlockBtn = document.getElementById('addBlockBtn');
  const blockedSitesList = document.getElementById('blockedSitesList');
  const blockMessage = document.getElementById('blockMessage');

  // Default categories - these are the initial categories if user has none saved
  const defaultCategories = {
    academic: [],
    entertainment: [],
    social_media: [],
    uncategorized: []
  };

  let userCategories = {}; // Stores user-defined categories and their assigned domains

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

  // Load user categories from local storage or initialize with defaults
  function loadCategories(callback) {
    chrome.storage.local.get(['userCategories'], function(result) {
      userCategories = result.userCategories || JSON.parse(JSON.stringify(defaultCategories));
      if (callback) callback();
    });
  }

  // Save user categories to local storage and update background script
  function saveCategories() {
    chrome.storage.local.set({ userCategories }, () => {
      // Send message to background script to update its userCategories
      chrome.runtime.sendMessage({ action: "updateUserCategories", userCategories: userCategories });
    });
  }

  // Syncs newly tracked domains into the 'uncategorized' list in userCategories
  function syncUserCategoriesWithData(data) {
    const allDomains = Object.keys(data);
    allDomains.forEach(domain => {
      // Check if the domain exists in any of the user-defined categories
      const isInUserCategories = Object.values(userCategories).some(arr => arr.includes(domain));
      if (!isInUserCategories) {
        // If not found, add it to 'uncategorized'
        if (!userCategories.uncategorized.includes(domain)) {
          userCategories.uncategorized.push(domain);
        }
      }
    });
    saveCategories(); // Save updated userCategories
  }

  // Assign each domain to a category based on userCategories
  function categorizeWebsites(data) {
    const categories = {
      academic: [],
      entertainment: [],
      social_media: [],
      uncategorized: []
    };
    // Build a reverse lookup: domain -> category
    const domainToCategory = {};
    for (const cat in userCategories) {
      userCategories[cat].forEach(domain => {
        domainToCategory[domain] = cat;
      });
    }
    // Assign each domain from trackedData to its determined category
    for (const domain in data) {
      const cat = domainToCategory[domain] || 'uncategorized'; // Default to uncategorized if not found
      categories[cat].push({
        domain: domain,
        time: Object.values(data[domain]).reduce((a, b) => a + b, 0) // Sum all time for the domain
      });
    }
    return categories;
  }

  // Human-friendly time formatting (e.g., "1 hour 30 mins")
  function formatTime(ms) {
    const totalMinutes = Math.round(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
  }

  // Render the main website list grouped by category
  function renderWebsiteList(data, categories) {
    websiteList.innerHTML = '';
    const categoryNames = {
      academic: "Academic",
      entertainment: "Entertainment",
      social_media: "Social Media",
      uncategorized: "Uncategorized"
    };
    for (const category in categories) {
      if (categories[category].length === 0) continue; // Skip empty categories
      const catLi = document.createElement('li');
      catLi.innerHTML = `<strong>${categoryNames[category]}:</strong>`;
      websiteList.appendChild(catLi);

      const subUl = document.createElement('ul');
      subUl.className = 'sub-categories';

      categories[category].sort((a, b) => b.time - a.time); // Sort by time spent (descending)
      categories[category].forEach(item => {
        const subLi = document.createElement('li');
        subLi.textContent = `${item.domain}: ${formatTime(item.time)}`;
        subUl.appendChild(subLi);
      });

      websiteList.appendChild(subUl);
    }
  }

  // Render the category manager for moving websites between categories
  function renderCategoryManager(categories) {
    categoryList.innerHTML = '';
    const categoryDisplayNames = {
      academic: "Academic",
      entertainment: "Entertainment",
      social_media: "Social Media",
      uncategorized: "Uncategorized"
    };

    for (const cat in userCategories) { // Iterate over userCategories to ensure all are displayed
      const domainsInThisCategory = userCategories[cat];
      if (domainsInThisCategory.length === 0) continue; // Skip if no domains assigned by user

      // Category name as a heading above the list
      const catLi = document.createElement('li');
      catLi.innerHTML = `<div class="category-label"><strong>${categoryDisplayNames[cat]}</strong></div>`;
      const subUl = document.createElement('ul');
      subUl.className = 'category-website-list';

      domainsInThisCategory.sort(); // Sort domains alphabetically
      domainsInThisCategory.forEach(domain => {
        const subLi = document.createElement('li');
        subLi.innerHTML = `
          <span class="domain-name">${domain}</span>
          <select data-cat="${cat}" data-domain="${domain}" class="move-domain">
            ${Object.keys(userCategories).filter(c => c !== cat).map(otherCat =>
              `<option value="${otherCat}">${categoryDisplayNames[otherCat]}</option>`
            ).join('')}
          </select>
          <button data-cat="${cat}" data-domain="${domain}" class="move-btn">Move</button>
        `;
        subUl.appendChild(subLi);
      });
      catLi.appendChild(subUl);
      categoryList.appendChild(catLi);
    }
  }

  // Handle moving websites between categories
  categoryList.addEventListener('click', function(e) {
    if (e.target.classList.contains('move-btn')) {
      const cat = e.target.dataset.cat;
      const domain = e.target.dataset.domain;
      const select = e.target.previousElementSibling;
      const newCat = select.value;

      if (newCat && userCategories[newCat] && userCategories[cat].includes(domain)) {
        // Remove from old category
        userCategories[cat] = userCategories[cat].filter(d => d !== domain);
        // Add to new category
        if (!userCategories[newCat].includes(domain)) {
          userCategories[newCat].push(domain);
        }
        saveCategories(); // Save changes to storage and update background

        // Re-render everything with new assignments
        chrome.storage.local.get(['websiteTimeData'], function(result) {
          const websiteTimeData = result.websiteTimeData || {};
          // No need to syncUserCategoriesWithData here as we just moved it
          const categories = categorizeWebsites(websiteTimeData);
          renderWebsiteList(websiteTimeData, categories);
          renderCategoryManager(categories);
        });
      }
    }
  });

  // Render the category chart (pie chart)
  function renderCategoryChart(data, categories) {
    // Destroy previous chart instance if exists to prevent multiple charts on updates
    if (window.categoryChartInstance) {
      window.categoryChartInstance.destroy();
    }
    const categoryTotals = {
      academic: 0,
      entertainment: 0,
      social_media: 0,
      uncategorized: 0
    };
    for (const cat in categories) {
      categories[cat].forEach(item => {
        categoryTotals[cat] += item.time;
      });
    }

    // Convert milliseconds to hours for chart display
    const academicHours = (categoryTotals.academic / (1000 * 60 * 60)).toFixed(2);
    const entertainmentHours = (categoryTotals.entertainment / (1000 * 60 * 60)).toFixed(2);
    const socialMediaHours = (categoryTotals.social_media / (1000 * 60 * 60)).toFixed(2);
    const uncategorizedHours = (categoryTotals.uncategorized / (1000 * 60 * 60)).toFixed(2);

    window.categoryChartInstance = new Chart(categoryChartCanvas, {
      type: 'pie',
      data: {
        labels: ['Academic', 'Entertainment', 'Social Media', 'Uncategorized'],
        datasets: [{
          data: [academicHours, entertainmentHours, socialMediaHours, uncategorizedHours],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)', // Academic (Teal)
            'rgba(255, 99, 132, 0.6)', // Entertainment (Red)
            'rgba(54, 162, 235, 0.6)', // Social Media (Blue)
            'rgba(201, 203, 207, 0.6)' // Uncategorized (Grey)
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(201, 203, 207, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed !== null) {
                  // context.parsed is in hours (float), convert to minutes for display
                  const totalMinutes = Math.round(context.parsed * 60);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  if (hours > 0 && minutes > 0) {
                    label += `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
                  } else if (hours > 0) {
                    label += `${hours} hour${hours > 1 ? 's' : ''}`;
                  } else {
                    label += `${minutes} min${minutes !== 1 ? 's' : ''}`;
                  }
                }
                return label;
              }
            }
          }
        }
      }
    });
  }

  // ---- Website Blocker Logic (New) ----

  // Render the list of currently blocked sites
  function renderBlockedSites() {
    blockedSitesList.innerHTML = '';
    chrome.runtime.sendMessage({ action: "getBlockedSites" }, (response) => {
      if (response && response.blockedSites) {
        if (response.blockedSites.length === 0) {
          const li = document.createElement('li');
          li.textContent = "No sites currently blocked.";
          blockedSitesList.appendChild(li);
        } else {
          response.blockedSites.forEach(site => {
            const li = document.createElement('li');
            const timerText = site.timer === 0 ? "Indefinite" : `${site.timer} min`;
            li.innerHTML = `
              <span>${site.name} (${timerText})</span>
              <button data-domain="${site.name}" class="unblock-btn">Unblock</button>
            `;
            blockedSitesList.appendChild(li);
          });
        }
      } else {
        blockMessage.textContent = "Error loading blocked sites.";
        blockMessage.style.color = 'red';
      }
    });
  }

  // Handle adding a site to the blocked list
  addBlockBtn.addEventListener('click', function() {
    const domainToBlock = getDomain(blockDomainInput.value.trim());
    const timer = parseInt(blockTimerSelect.value);

    if (!domainToBlock) {
      blockMessage.textContent = "Please enter a valid domain.";
      blockMessage.style.color = 'red';
      return;
    }

    chrome.runtime.sendMessage({ action: "addBlockedSite", domain: domainToBlock, timer: timer }, (response) => {
      if (response.success) {
        blockMessage.textContent = response.message;
        blockMessage.style.color = 'green';
        blockDomainInput.value = ''; // Clear input
        renderBlockedSites(); // Re-render the list
      } else {
        blockMessage.textContent = response.message;
        blockMessage.style.color = 'red';
      }
    });
  });

  // Handle unblocking a site from the list
  blockedSitesList.addEventListener('click', function(e) {
    if (e.target.classList.contains('unblock-btn')) {
      const domainToUnblock = getDomain(e.target.dataset.domain);
      chrome.runtime.sendMessage({ action: "removeBlockedSite", domain: domainToUnblock }, (response) => {
        if (response.success) {
          blockMessage.textContent = response.message;
          blockMessage.style.color = 'green';
          renderBlockedSites(); // Re-render the list
        } else {
          blockMessage.textContent = response.message;
          blockMessage.style.color = 'red';
        }
      });
    }
  });

  // Initial load and render for both time tracking and blocking
  loadCategories(function() {
    chrome.storage.local.get(['websiteTimeData'], function(result) {
      const websiteTimeData = result.websiteTimeData || {};
      syncUserCategoriesWithData(websiteTimeData); // Ensure all tracked domains are in userCategories
      const categories = categorizeWebsites(websiteTimeData);
      renderWebsiteList(websiteTimeData, categories);
      renderCategoryManager(categories);
      renderCategoryChart(websiteTimeData, categories);
    });
    renderBlockedSites(); // Render blocked sites list on load
  });

  // Reset button logic: set a flag, do not clear data immediately
  const resetBtn = document.getElementById('resetTimeBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      // Show a custom modal instead of alert
      const confirmReset = confirm("Are you sure you want to reset all website time data? This will clear data after all Chrome windows are closed.");
      if (confirmReset) {
        chrome.storage.local.set({ resetPending: true }, function() {
          alert("Website time will be reset after you close all Chrome windows.");
        });
      }
    });
  }
});

// Simple custom alert/confirm replacement (for demonstration)
function confirm(message) {
  return window.confirm(message); // Using native for simplicity, but a custom modal is preferred
}
function alert(message) {
  window.alert(message); // Using native for simplicity
}
