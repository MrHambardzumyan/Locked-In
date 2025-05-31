# StudyFlow Extension 🚀

StudyFlow is a Chrome Extension designed to help students manage their time spent on websites, categorize their online activity, block distracting sites, and generate personalized study plans based on their academic assignments.

## Features ✨

### 1. Website Time Tracker ⏰
- **Tracks Time:** Monitors time spent on different websites.
- **Categorization:** Automatically categorizes websites into "Academic" 📚, "Entertainment" 🎬, "Social Media" 📱, and "Uncategorized" ❓ based on predefined rules and user-defined preferences.
- **Detailed Usage:** Provides a detailed breakdown of time spent on each website.
- **Category Summary:** Displays total time spent in each category through a pie chart 📊.

### 2. Website Blocker 🚫
- **Block Distractions:** Allows users to block specific websites for indefinite periods or set timers for temporary blocking.
- **Blocked Page:** Redirects users to a custom "Get Back To Work!" page 🚧 when a blocked site is accessed.
- **Timer-based Unblocking:** Automatically unblocks sites after a set timer expires ⏳.

### 3. AI Study Planner 🧠
- **Academic Integration (Canvas/Instructure):** Connects to academic platforms (currently configured for Instructure/Canvas) to fetch assignment data.
- **Personalized Plans:** Generates daily 🗓️ or weekly 📅 study plans using an AI model, based on fetched assignments and user-defined available study hours.
- **Secure Credentials:** Stores user CWID and password securely 🔒 in local storage for academic integrations.

## Project Structure 🏗️

The project consists of a Chrome Extension and a Flask backend for academic data extraction.

- `manifest.json`: Defines the Chrome Extension's properties, permissions, and background scripts.
- `background.js`: The service worker script that handles time tracking, website categorization, and blocking logic.
- `popup.html`: The HTML for the extension's popup interface, displaying website activity, category management, and blocker controls.
- `popup.js`: The JavaScript for the popup, handling UI interactions, data rendering, and communication with `background.js`.
- `styles.css`: CSS for styling the `popup.html`.
- `blocked.html`: The HTML page displayed when a user tries to access a blocked website.
- `app.py`: A Flask application that serves `index.html` and provides an API endpoint (`/get_data`) for extracting academic data.
- `extraction.py`: Contains the Selenium-based logic for logging into Instructure/Canvas and extracting assignment data.
- `index.html`: The frontend for the AI Study Planner, allowing users to input credentials and generate study plans.

## Setup and Installation 🛠️

### Chrome Extension 🌐

1.  **Download/Clone:** Download or clone the entire project repository.
2.  **Open Chrome Extensions:** Open Chrome and navigate to `chrome://extensions`.
3.  **Enable Developer Mode:** Toggle on "Developer mode" in the top right corner.
4.  **Load Unpacked:** Click on "Load unpacked" and select the directory where you downloaded/cloned the project.
5.  **Pin Extension:** Pin the StudyFlow extension to your Chrome toolbar for easy access.

### Flask Backend (for AI Study Planner) 🐍

The AI Study Planner requires a Python Flask backend to extract data from Canvas/Instructure.

1.  **Install Python:** Ensure you have Python 3 installed.
2.  **Install Dependencies:**
    ```bash
    pip install Flask selenium
    ```
3.  **Install Chrome Driver:**
    -   Download the ChromeDriver executable that matches your Chrome browser version from [https://chromedriver.chromium.org/downloads](https://chromedriver.chromium.org/downloads).
    -   Place the `chromedriver` executable in your system's PATH or in the same directory as `extraction.py`.
4.  **Run Flask App:**
    ```bash
    python app.py
    ```
    The Flask app will typically run on `http://127.0.0.1:5000`.

## Usage 💡

### Website Time Tracker & Blocker (Chrome Extension Popup) 🖥️

1.  Click on the StudyFlow extension icon in your Chrome toolbar.
2.  **Website Activity:** View your total time spent by category and a detailed list of websites visited.
3.  **Move Websites Between Categories:** Use the "Move Websites Between Categories" section to reassign domains to different categories (Academic, Entertainment, Social Media, Uncategorized). This will influence how your time is tracked.
4.  **Website Blocker:**
    -   Enter a domain (e.g., `youtube.com`) in the input field.
    -   Select a timer duration (e.g., 30 minutes, or "Indefinite").
    -   Click "Block Site" to add it to your blocked list.
    -   To unblock, click the "Unblock" button next to the site in the "Currently Blocked Sites" list.
5.  **Reset Data:** Click "Reset Website Time" to clear all tracked data. This will take effect after all Chrome windows are closed.

### AI Study Planner (Web Interface) 🧑‍💻

1.  Ensure your Flask backend is running (`python app.py`).
2.  In the Chrome Extension popup, click on the "AI Study Planner" link. This will open `http://127.0.0.1:5000` in a new tab.
3.  **Student Credentials:**
    -   Enter your CWID (Campus Wide ID) and Password for your Instructure/Canvas account.
    -   Click "Save Credentials" to store them securely in your browser's local storage.
    -   Click "Clear" to remove saved credentials.
    -   Use "Show/Hide" to toggle password visibility.
4.  **Generate Study Plan:**
    -   Select your desired "Plan Duration" (Daily or Weekly).
    -   Enter your "Available Study Hours" per day.
    -   Click "Generate AI Study Plan". The system will fetch your assignments from Canvas and generate a personalized study plan using an AI model.
5.  **Quick Study Session:** The floating action button (⚡) is a placeholder for a quick focus session timer (e.g., Pomodoro).

## Important Notes 📝

-   **Security:** Your academic credentials are stored locally in your browser's local storage. While this is generally secure for a single user, be mindful of who has access to your computer.
-   **Selenium Headless:** The `extraction.py` script uses Selenium in headless mode, meaning a browser window will not visibly open when extracting data.
-   **AI Model:** The AI study plan generation relies on an external AI service (`https://text.pollinations.ai/`). Ensure you have an internet connection for this feature to work.
-   **Error Handling:** The system includes basic error handling for data extraction and AI generation. If issues occur, notifications will be displayed.
-   **Resetting Data:** The website time data is reset only after all Chrome windows are closed and the `resetPending` flag is set. This prevents accidental data loss during active browsing.

## Future Enhancements 🌟

-   More robust error handling and user feedback.
-   Integration with other academic platforms.
-   Advanced customization options for study plans.
-   Detailed analytics and reporting for time usage.
-   Improved UI/UX for all components.
-   Pomodoro timer integration for quick study sessions.
