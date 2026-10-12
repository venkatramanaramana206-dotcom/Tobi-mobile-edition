J.A.R.V.I.S. AI — Android-friendly HTML/PWA starter

FILES
- index.html: UI and JavaScript app logic
- manifest.json: installable PWA metadata
- sw.js: basic offline shell cache

INSTALL ON ANDROID
1. Upload these three files to an HTTPS static host (for example, GitHub Pages or Netlify).
2. Open the hosted URL in Chrome on Android.
3. Open Chrome menu and choose Install app or Add to Home screen.
4. In Settings, add a Gemini API key for AI answers.
5. For weather, add an OpenWeather API key and city.

FEATURES
- Dark futuristic interface, animated reactor, microphone glow
- Current date/time, best-effort battery status, weather API connection
- Speech recognition where browser-supported, speech output, language selector
- Gemini API connection, local settings storage, common voice commands
- Video selection, four CSS preview styles, original download and native sharing / WhatsApp fallback

IMPORTANT LIMITATIONS
- This is an HTML Progressive Web App, not a compiled APK.
- Browser voice recognition and battery APIs vary by device/browser. Microphone requires permission and normally HTTPS.
- Video styles are preview filters only. The app does not create a newly rendered AI-edited video. Real AI video generation/export requires a suitable provider API and backend.
- Direct calling is not automatic; the app may open the phone dialer and the user must confirm.
- For public release, do not expose API keys in client-side HTML/localStorage. Use a secure backend proxy and appropriate usage limits.
- API model availability and quotas can change; update the Gemini endpoint/model as needed.
