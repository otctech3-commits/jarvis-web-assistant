# jarvis-web-assistant
https://mk-bots.blogspot.com/2026/05/mk-bots.html
# J.A.R.V.I.S Web Assistant 🤖

Voice-controlled AI assistant with live web search. Deploy to GitHub Pages in 2 minutes.

## Features
- 🎤 **Voice Control** - "Hey Jarvis" wake word + speech recognition
- 🔍 **Web Search** - Wikipedia + DuckDuckGo APIs, no API key needed
- 🌤️ **Weather** - Live conditions via wttr.in
- 📰 **News** - Latest headlines
- 🕐 **Time/Date** - Clock with visual display
- 🧮 **Calculator** - Voice math computation
- 🎨 **Visual HUD** - Iron Man style interface with live data cards
- 💯 **100% Client-Side** - No backend, runs on GitHub Pages

## Deploy Now
1. Create new GitHub repo
2. Upload all 5 files to root
3. Settings → Pages → Deploy from `main` branch
4. Visit `https://username.github.io/repo-name/`
5. Allow microphone access
6. Say "Hey Jarvis" or click the core

## Voice Commands
| Command | Action |
| --- | --- |
| "Hey Jarvis" | Wake word activation |
| "What time is it" | Shows clock on HUD |
| "Weather" | Live weather with visual |
| "News" / "Headlines" | Latest news cards |
| "Search for black holes" | Web search + visual result |
| "Tell me about Tesla" | Wikipedia lookup |
| "Who is Elon Musk" | Person search |
| "Calculate 420 * 69" | Math with big display |
| "System status" | Diagnostics panel |
| "Tell me a joke" | AI humor |

## Tech Stack
- Web Speech API - Voice recognition + synthesis
- Wikipedia REST API - Factual data
- DuckDuckGo Instant Answer API - Web search
- wttr.in - Weather data
- Vanilla JS - No frameworks, no build
- CSS Animations - HUD effects

## Browser Support
Chrome/Edge recommended. Firefox lacks speech recognition. Safari partial support.

## Customize
Edit `jarvis.js` → `processCommand()` to add new commands.
Edit `style.css` → `:root` colors to change HUD theme.

## Upgrade Ideas
- Add OpenAI API for real conversation
- DALL-E image generation on screen
- Spotify/YouTube control
- Smart home integration

**Tony Stark would be proud.**

MIT License
