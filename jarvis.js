const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

let listening = false;
let voiceEnabled = true;
let aiConfig = JSON.parse(localStorage.getItem('jarvis_ai_config') || '{"provider":"none","key":""}');
let searchHistory = [];

// DOM
const coreCenter = document.getElementById('coreCenter');
const micIcon = document.getElementById('micIcon');
const waveform = document.getElementById('waveform');
const chatLog = document.getElementById('chatLog');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const clearBtn = document.getElementById('clearBtn');
const settingsBtn = document.getElementById('settingsBtn');
const screenContent = document.getElementById('screenContent');
const micStatus = document.getElementById('micStatus');
const aiStatus = document.getElementById('aiStatus');
const netStatus = document.getElementById('netStatus');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');
const demoMode = document.getElementById('demoMode');
const apiKeyInput = document.getElementById('apiKey');
const aiProviderSelect = document.getElementById('aiProvider');

// Clock
setInterval(() => {
  document.getElementById('timeDisplay').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}, 1000);

// Status indicators
netStatus.classList.add('active');
if (aiConfig.key && aiConfig.provider!== 'none') aiStatus.classList.add('active');

// Settings Modal
settingsBtn.onclick = () => {
  settingsModal.classList.add('active');
  apiKeyInput.value = aiConfig.key;
  aiProviderSelect.value = aiConfig.provider;
};
closeSettings.onclick = () => settingsModal.classList.remove('active');
settingsModal.onclick = (e) => { if (e.target === settingsModal) settingsModal.classList.remove('active'); };

saveSettings.onclick = () => {
  const key = apiKeyInput.value.trim();
  const provider = aiProviderSelect.value;
  if (provider!== 'none' &&!key) return alert('Please enter API key');

  aiConfig = { provider, key };
  localStorage.setItem('jarvis_ai_config', JSON.stringify(aiConfig));
  aiStatus.classList.toggle('active', provider!== 'none' && key);
  settingsModal.classList.remove('active');
  speak('AI core configuration updated, Sir.');
  addMessage('jarvis', `AI Mode: ${provider.toUpperCase()} activated`);
};

demoMode.onclick = () => {
  aiConfig = { provider: 'none', key: '' };
  localStorage.setItem('jarvis_ai_config', JSON.stringify(aiConfig));
  aiStatus.classList.remove('active');
  settingsModal.classList.remove('active');
  speak('Operating in search-only mode, Sir.');
};

// Voice Setup
if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onstart = () => {
    listening = true;
    coreCenter.classList.add('active');
    waveform.classList.add('active');
    micStatus.classList.add('active');
    micIcon.className = 'fa-solid fa-microphone';
  };

  recognition.onend = () => {
    listening = false;
    coreCenter.classList.remove('active');
    waveform.classList.remove('active');
    micStatus.classList.remove('active');
    micIcon.className = 'fa-solid fa-microphone-slash';
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    addMessage('user', transcript);
    processCommand(transcript);
  };

  recognition.onerror = (e) => {
    log('Voice error: ' + e.error);
    if (e.error!== 'no-speech' && e.error!== 'aborted') speak('Audio input error, Sir.');
  };
}

function speak(text) {
  if (!voiceEnabled ||!text) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.85;
  utterance.volume = 0.95;
  const voices = synth.getVoices();
  const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google UK English Male'));
  if (maleVoice) utterance.voice = maleVoice;
  synth.speak(utterance);
}

function addMessage(sender, text, isThinking = false) {
  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;
  if (isThinking) {
    msg.innerHTML = `<span class="msg-label">${sender}:</span><div class="thinking"><span></span><span></span></div>`;
    msg.id = 'thinking-msg';
  } else {
    msg.innerHTML = `<span class="msg-label">${sender}:</span>${text}`;
  }
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
  return msg;
}

function removeThinking() {
  const thinking = document.getElementById('thinking-msg');
  if (thinking) thinking.remove();
}

function displayCard(html) {
  screenContent.innerHTML = html;
}

function log(text) {
  console.log('[JARVIS]', text);
}

// Core click
coreCenter.onclick = () => {
  if (!recognition) return alert('Speech recognition requires Chrome or Edge');
  if (listening) recognition.stop();
  else recognition.start();
};

// Voice toggle
voiceBtn.onclick = () => {
  voiceEnabled =!voiceEnabled;
  voiceBtn.innerHTML = voiceEnabled? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
  speak(voiceEnabled? 'Voice synthesis enabled' : 'Voice synthesis muted');
};

// Text input
sendBtn.onclick = () => {
  const text = textInput.value.trim();
  if (text) {
    addMessage('user', text);
    processCommand(text);
    textInput.value = '';
  }
};
textInput.onkeypress = (e) => { if (e.key === 'Enter') sendBtn.click(); };

clearBtn.onclick = () => {
  screenContent.innerHTML = '<div class="welcome-msg"><h2>Display Reset</h2><p>Awaiting directives, Sir</p></div>';
  chatLog.innerHTML = '';
  speak('Interface cleared');
};

// WEB SEARCH
async function searchWeb(query) {
  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const wikiRes = await fetch(wikiUrl);
    if (wikiRes.ok) {
      const data = await wikiRes.json();
      if (data.extract &&!data.extract.includes('may refer to')) {
        return {
          source: 'Wikipedia',
          title: data.title,
          text: data.extract,
          url: data.content_urls?.desktop?.page,
          thumbnail: data.thumbnail?.source
        };
      }
    }

    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl);
    const ddgData = await ddgRes.json();

    if (ddgData.AbstractText) {
      return {
        source: 'DuckDuckGo',
        title: ddgData.Heading || query,
        text: ddgData.AbstractText,
        url: ddgData.AbstractURL,
        thumbnail: ddgData.Image
      };
    }

    if (ddgData.RelatedTopics?.length > 0 && ddgData.RelatedTopics[0].Text) {
      return {
        source: 'DuckDuckGo',
        title: ddgData.RelatedTopics[0].Text.split(' - ')[0],
        text: ddgData.RelatedTopics[0].Text,
        url: ddgData.RelatedTopics[0].FirstURL
      };
    }
    return null;
  } catch (e) {
    log('Search error: ' + e.message);
    return null;
  }
}

// AI CALL - Groq or OpenAI
async function callAI(userQuery, searchContext = '') {
  if (aiConfig.provider === 'none' ||!aiConfig.key) {
    return null;
  }

  const systemPrompt = `You are J.A.R.V.I.S, Tony Stark's AI assistant. Be concise, witty, intelligent. Address user as "Sir". If web search results provided, synthesize them into a natural answer. Don't just repeat the search. Keep responses under 3 sentences for voice.`;

  const userPrompt = searchContext
   ? `Web search results for "${userQuery}":\n${searchContext}\n\nProvide a concise answer based on this info.`
    : userQuery;

  try {
    let url, headers, body;

    if (aiConfig.provider === 'groq') {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.key}`
      };
      body = JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      });
    } else if (aiConfig.provider === 'openai') {
      url = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.key}`
      };
      body = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      });
    }

    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) throw new Error('AI API error');

    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (e) {
    log('AI error: ' + e.message);
    return null;
  }
}

// MAIN COMMAND PROCESSOR
async function processCommand(cmd) {
  const lower = cmd.toLowerCase();
  let response = '';
  let visual = '';
  let needsAI = false;
  let searchQuery = '';

  // Time
  if (lower.includes('time')) {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    response = `The current time is ${time}, Sir`;
    visual = `<div class="card"><div class="clock-display">${time}</div></div>`;
  }

  // Date
  else if (lower.includes('date') || lower.includes('today')) {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    response = `Today is ${date}`;
    visual = `<div class="card"><h3>📅 ${date}</h3></div>`;
  }

  // Weather
  else if (lower.includes('weather')) {
    response = 'Accessing meteorological data...';
    speak(response);
    try {
      const res = await fetch('https://wttr.in/?format=j1');
      const data = await res.json();
      const c = data.current_condition[0];
      response = `${c.temp_C} degrees Celsius, ${c.weatherDesc[0].value}. Feels like ${c.FeelsLikeC} degrees, Sir.`;
      visual = `<div class="card weather-card">
        <div class="weather-icon">🌤️</div>
        <div>
          <h3>Weather Conditions</h3>
          <p style="font-size:32px;">${c.temp_C}°C - ${c.weatherDesc[0].value}</p>
          <p>Feels like: ${c.FeelsLikeC}°C | Humidity: ${c.humidity}%</p>
          <p>Wind: ${c.windspeedKmph} km/h ${c.winddir16Point}</p>
        </div>
      </div>`;
    } catch {
      response = 'Weather satellite link failed, Sir.';
    }
  }

  // News
  else if (lower.includes('news') || lower.includes('headlines')) {
    response = 'Retrieving global news feed...';
    speak(response);
    try {
      const res = await fetch('https://api.duckduckgo.com/?q=latest+world+news&format=json&no_html=1');
      const data = await res.json();
      const news = data.RelatedTopics?.slice(0, 5).filter(t => t.Text) || [];
      if (news.length > 0) {
        response = 'Latest headlines displayed on screen, Sir.';
        visual = `<div class="card"><h3>📰 Global News Feed</h3>` +
          news.map(n => `<p style="margin:12px 0;padding:12px;border-left:3px solid var(--hud);background:rgba(0,217,255,0.05);">
            <a href="${n.FirstURL}" target="_blank" style="color:var(--text);text-decoration:none;">${n.Text}</a>
          </p>`).join('') + `</div>`;
      } else {
        response = 'News feed unavailable at the moment, Sir.';
      }
    } catch {
      response = 'Unable to access news networks, Sir.';
    }
  }

  // Math
  else if (lower.match(/(\d+)\s*[\+\-\*\/x]\s*(\d+)/)) {
    try {
      const cleanExpr = lower.replace(/x/g, '*').replace(/[^-()\d/*+.]/g, '');
      const result = Function(`'use strict'; return (${cleanExpr})`)();
      response = `The result is ${result}, Sir`;
      visual = `<div class="card"><h3>🧮 Computation Complete</h3><p style="font-size:52px;text-align:center;text-shadow:0 0 30px var(--hud-glow);">${cleanExpr} = ${result}</p></div>`;
    } catch {
      response = 'Unable to compute that expression, Sir.';
    }
  }

  // System status
  else if (lower.includes('status') || lower.includes('system') || lower.includes('diagnostic')) {
    const mem = performance.memory? (performance.memory.usedJSHeapSize / 1048576).toFixed(2) : 'Unknown';
    const aiMode = aiConfig.provider!== 'none' && aiConfig.key? aiConfig.provider.toUpperCase() : 'DISABLED';
    response = 'All systems operational. AI core online. Web access confirmed.';
    visual = `<div class="card"><h3>⚡ System Diagnostics</h3>
      <p>🟢 Core Systems: OPERATIONAL</p>
      <p>🟢 Network Link: ESTABLISHED</p>
      <p>🟢 Memory Usage: ${mem} MB</p>
      <p>🟢 Voice Interface: ${voiceEnabled? 'ACTIVE' : 'MUTED'}</p>
      <p>🟢 AI Engine: ${aiMode}</p>
      <p>🟢 Web Search: ENABLED</p>
      <p>🟢 Queries Processed: ${searchHistory.length}</p>
      <p style="margin-top:15px;font-size:11px;color:var(--hud-dim);">Last scan: ${new Date().toLocaleString()}</p>
    </div>`;
  }

  // Jokes
  else if (lower.includes('joke')) {
    const jokes = [
      'Why did the AI cross the road? To optimize the other side, Sir.',
      'I would tell you a UDP joke, but you might not get it.',
      'My processing power exceeds 9000. Reference acknowledged, Sir.',
      'Why do programmers prefer dark mode? Because light attracts bugs, Sir.'
    ];
    response = jokes[Math.floor(Math.random() * jokes.length)];
  }

  // SEARCH + AI - Main feature
  else if (lower.includes('search') || lower.includes('what is') || lower.includes('who is') || lower.includes('tell me about') || lower.includes('explain') || lower.includes('define') || lower.includes('how') || lower.includes('why')) {
    searchQuery = cmd.replace(/search|for|what is|who is|tell me about|explain|define|google|how|why|hey jarvis/gi, '').trim();

    if (!searchQuery) {
      response = 'What topic shall I research for you, Sir?';
    } else {
      const thinkingMsg = addMessage('jarvis', '', true);
      speak('Searching global databanks...');

      const searchResult = await searchWeb(searchQuery);
      removeThinking();

      if (searchResult) {
        // If AI enabled, use AI to summarize
        if (aiConfig.provider!== 'none' && aiConfig.key) {
          speak('Analyzing data...');
          const aiResponse = await callAI(searchQuery, `${searchResult.title}: ${searchResult.text}`);
          response = aiResponse || `${searchResult.text.substring(0, 200)}... According to ${searchResult.source}, Sir.`;
        } else {
          response = `According to ${searchResult.source}: ${searchResult.text.substring(0, 200)}...`;
        }

        visual = `<div class="card">
          <h3>🔍 ${searchResult.title}</h3>
          ${searchResult.thumbnail? `<img src="${searchResult.thumbnail}" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px;margin:15px 0;box-shadow:0 0 25px rgba(0,217,255,0.3);">` : ''}
          <p style="line-height:1.8;font-size:15px;">${searchResult.text}</p>
          ${searchResult.url? `<a href="${searchResult.url}" target="_blank" style="color:var(--hud);margin-top:18px;display:inline-block;text-decoration:none;border:1px solid var(--hud);padding:10px 20px;border-radius:8px;transition:0.2s;">View Full Article on ${searchResult.source} →</a>` : ''}
          <p style="font-size:11px;color:var(--hud-dim);margin-top:18px;">Source: ${searchResult.source} | Query: "${searchQuery}"</p>
        </div>`;
        searchHistory.push({ query: searchQuery, time: Date.now() });
      } else {
        response = `I found no data on ${searchQuery} in accessible databanks, Sir.`;
        visual = `<div class="card"><h3>❌ No Results Found</h3><p>No information available for "${searchQuery}"</p><p style="margin-top:10px;color:var(--hud-dim);">Try rephrasing or being more specific</p></div>`;
      }
    }
  }

  // Greeting
  else if (lower.match(/^(hi|hello|hey|hey jarvis|good morning|good evening)/)) {
    const hours = new Date().getHours();
    const greeting = hours < 12? 'Good morning' : hours < 18? 'Good afternoon' : 'Good evening';
    const aiStatus = aiConfig.provider!== 'none' && aiConfig.key? 'AI systems online' : 'Search-only mode active';
    response = `${greeting}, Sir. ${aiStatus}. All systems ready. How may I assist you?`;
  }

  // Default - Use AI if available
  else {
    if (aiConfig.provider!== 'none' && aiConfig.key) {
      const thinkingMsg = addMessage('jarvis', '', true);
      speak('Processing...');
      const aiResponse = await callAI(cmd);
      removeThinking();
      response = aiResponse || 'I am not certain how to respond to that, Sir. Try asking me to search for something specific.';
    } else {
      response = 'I can search the web for information, Sir. Try "search for" or "tell me about" followed by your query. For full AI conversation, add an API key in settings.';
      visual = `<div class="card"><h3>💡 Command Reference</h3>
        <p><strong>"Hey Jarvis"</strong> - Wake word</p>
        <p><strong>"What time is it"</strong> - Current time</p>
        <p><strong>"Weather"</strong> - Live weather data</p>
        <p><strong>"News"</strong> - Latest headlines</p>
        <p><strong>"Search for quantum physics"</strong> - Web search</p>
        <p><strong>"Tell me about SpaceX"</strong> - Topic lookup</p>
        <p><strong>"Calculate 42 * 17"</strong> - Mathematics</p>
        <p><strong>"System status"</strong> - Diagnostics</p>
        <p style="margin-top:15px;color:var(--hud-dim);font-size:12px;">Click ⚙️ to enable AI conversation mode</p>
      </div>`;
    }
  }

  addMessage('jarvis', response);
  speak(response);
  if (visual) displayCard(visual);
}

// Wake word detection
if (recognition) {
  const wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = true;
  wakeRecognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('').toLowerCase();
    if (transcript.includes('hey jarvis') || transcript.includes('jarvis')) {
      wakeRecognition.stop();
      speak('Yes, Sir?');
      setTimeout(() => { try { recognition.start(); } catch {} }, 700);
    }
  };
  wakeRecognition.onerror = () => {
    setTimeout(() => { try { wakeRecognition.start(); } catch {} }, 1000);
  };
  try { wakeRecognition.start(); } catch {}
}

// Load voices
window.speechSynthesis.onvoiceschanged = () => { synth.getVoices(); };

// Initial greeting
setTimeout(() => {
  const aiMode = aiConfig.provider!== 'none' && aiConfig.key? 'AI intelligence active' : 'Search mode active';
  const greeting = `J.A.R.V.I.S online. ${aiMode}. Web search enabled. All systems nominal, Sir.`;
  speak(greeting);
  addMessage('jarvis', greeting);

  if (aiConfig.provider === 'none' ||!aiConfig.key) {
    setTimeout(() => {
      displayCard(`<div class="card" style="border-color:#eab308;">
        <h3>⚠️ AI Mode Disabled</h3>
        <p>Click the ⚙️ settings icon to add your API key and unlock full AI conversation.</p>
        <p style="margin-top:12px;">Free key: <a href="https://console.groq.com/keys" target="_blank" style="color:var(--hud);">Groq Console</a></p>
        <p style="margin-top:8px;font-size:12px;color:var(--hud-dim);">Without AI: I can still search web, weather, news, calculate</p>
      </div>`);
    }, 3000);
  }
}, 1500);
