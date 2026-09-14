<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

## Google Calendar add-on

A personal Google Calendar sidebar is available in [`google-calendar-addon`](./google-calendar-addon/README.zh-CN.md). It supports daily/weekly tasks, independent long-term lists, reviews and calendar time blocks. See the installation guide for Google account setup and current limitations. The website's **Export Backup** button exports existing browser data for a one-time migration; the add-on does not automatically sync with this website.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/cebf21d5-86fa-4cd5-a310-ddfd377c4885

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
