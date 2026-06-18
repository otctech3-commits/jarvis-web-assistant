const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

let listening = false;
let voiceEnabled = true;
let searchHistory = [];

const coreCenter = document.getElementById('coreCenter');
const micIcon = document.getElementById('micIcon');
const waveform = document.getElementById('waveform');
const chatLog = document.getElementById('chatLog');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const clearBtn = document.getElementById('clearBtn');
const screenContent = document.getElementById('screenContent');
const micStatus = document.getElementById('micStatus');
const netStatus = document.getElementById('netStatus');

setInterval(() => {
  document.getElementById('timeDisplay').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}, 1000);

netStatus.classList.add('active');

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
    if (e.error!== 'no-speech' && e.error!== 'aborted') speak('I did not catch that, Sir.');
  };
}

function speak(text) {
  if (!voiceEnabled ||!text) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 0.85;
  utterance.volume = 0.9;
  const voices = synth.getVoices();
  const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google UK English Male'));
  if (maleVoice) utterance.voice = maleVoice;
  synth.speak(utterance);
}

function addMessage(sender, text) {
  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;
  msg.innerHTML = `<span class="msg-label">${sender}:</span>${text}`;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function displayCard(html) {
  screenContent.innerHTML = html;
}

function log(text) {
  console.log('[JARVIS]', text);
}

coreCenter.onclick = () => {
  if (!recognition) return alert('Speech recognition requires Chrome or Edge browser');
  if (listening) recognition.stop();
  else recognition.start();
};

voiceBtn.onclick = () => {
  voiceEnabled =!voiceEnabled;
  voiceBtn.innerHTML = voiceEnabled? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
  speak(voiceEnabled? 'Voice synthesis enabled' : 'Voice synthesis disabled');
};

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
  screenContent.innerHTML = '<div class="welcome-msg"><h2>Display Cleared</h2><p>Awaiting new directives, Sir</p></div>';
  chatLog.innerHTML = '';
  speak('Screen cleared');
};

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

    if (ddgData.RelatedTopics?.length > 0) {
      const topic = ddgData.RelatedTopics[0];
      if (topic.Text) {
        return {
          source: 'DuckDuckGo',
          title: topic.Text.split(' - ')[0] || query,
          text: topic.Text,
          url: topic.FirstURL
        };
      }
    }
    return null;
  } catch (e) {
    log('Search error: ' + e.message);
    return null;
  }
}

async function fetchNews() {
  try {
    const res = await fetch('https://api.duckduckgo.com/?q=latest+world+news&format=json&no_html=1');
    const data = await res.json();
    return data.RelatedTopics?.slice(0, 5).filter(t => t.Text) || [];
  } catch {
    return [];
  }
}

async function processCommand(cmd) {
  const lower = cmd.toLowerCase();
  let response = '';
  let visual = '';

  if (lower.match(/^(hi|hello|hey|hey jarvis|good morning|good evening)/)) {
    const hours = new Date().getHours();
    const greeting = hours < 12? 'Good morning' : hours < 18? 'Good afternoon' : 'Good evening';
    response = `${greeting}, Sir. All systems operational. Web search is online. How may I assist you?`;
  }

  else if (lower.includes('time')) {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    response = `The current time is ${time}, Sir`;
    visual = `<div class="card"><div class="clock-display">${time}</div></div>`;
  }

  else if (lower.includes('date') || lower.includes('today') || lower.includes('day')) {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    response = `Today is ${date}`;
    visual = `<div class="card"><h3>📅 Calendar</h3><p style="font-size:24px;text-align:center;">${date}</p></div>`;
  }

  else if (lower.includes('weather')) {
    response = 'Accessing meteorological satellites...';
    speak(response);
    try {
      const res = await fetch('https://wttr.in/?format=j1');
      const data = await res.json();
      const c = data.current_condition[0];
      response = `Current conditions: ${c.temp_C} degrees Celsius, ${c.weatherDesc[0].value}. Feels like ${c.FeelsLikeC} degrees.`;
      visual = `<div class="card weather-card">
        <div class="weather-icon">🌤️</div>
        <div>
          <h3>Weather Report</h3>
          <p style="font-size:28px;">${c.temp_C}°C - ${c.weatherDesc[0].value}</p>
          <p>Feels like: ${c.FeelsLikeC}°C | Humidity: ${c.humidity}%</p>
          <p>Wind: ${c.windspeedKmph} km/h ${c.winddir16Point}</p>
        </div>
      </div>`;
    } catch {
      response = 'Unable to retrieve weather data. Satellite uplink failed, Sir.';
    }
  }

  else if (lower.includes('news') || lower.includes('headlines')) {
    response = 'Scanning global news networks...';
    speak(response);
    const news = await fetchNews();
    if (news.length > 0) {
      response = 'Displaying latest headlines on screen, Sir.';
      visual = `<div class="card"><h3>📰 Global News Feed</h3>` +
        news.map(n => `<p style="margin:12px 0;padding:12px;border-left:3px solid var(--hud);background:rgba(0,217,255,0.05);">
          <a href="${n.FirstURL}" target="_blank" style="color:var(--text);text-decoration:none;">${n.Text}</a>
        </p>`).join('') + `</div>`;
    } else {
      response = 'News feed temporarily unavailable, Sir.';
    }
  }

  else if (lower.match(/(\d+)\s*[\+\-\*\/x]\s*(\d+)/)) {
    try {
      const cleanExpr = lower.replace(/x/g, '*').replace(/[^-()\d/*+.]/g, '');
      const result = Function(`'use strict'; return (${cleanExpr})`)();
      response = `The answer is ${result}, Sir`;
      visual = `<div class="card"><h3>🧮 Calculation Result</h3><p style="font-size:48px;text-align:center;text-shadow:0 0 20px var(--hud-glow);">${cleanExpr} = ${result}</p></div>`;
    } catch {
      response = 'I could not compute that expression, Sir.';
    }
  }

  else if (lower.includes('search') || lower.includes('what is') || lower.includes('who is') || lower.includes('tell me about') || lower.includes('explain') || lower.includes('define')) {
    const query = cmd.replace(/search|for|what is|who is|tell me about|explain|define|google/gi, '').trim();
    if (!query) {
      response = 'What subject shall I research for you, Sir?';
    } else {
      response = `Searching global databanks for ${query}...`;
      speak(response);
      const result = await searchWeb(query);
      if (result) {
        response = `According to ${result.source}, ${result.text.substring(0, 180)}...`;
        visual = `<div class="card">
          <h3>🔍 ${result.title}</h3>
          ${result.thumbnail? `<img src="${result.thumbnail}" style="width:100%;max-height:250px;object-fit:cover;border-radius:10px;margin:15px 0;box-shadow:0 0 20px rgba(0,217,255,0.3);">` : ''}
          <p style="line-height:1.8;">${result.text}</p>
          ${result.url? `<a href="${result.url}" target="_blank" style="color:var(--hud);margin-top:15px;display:inline-block;text-decoration:none;border:1px solid var(--hud);padding:8px 16px;border-radius:6px;">View on ${result.source} →</a>` : ''}
          <p style="font-size:11px;color:var(--hud-dim);margin-top:15px;">Source: ${result.source} | Retrieved: ${new Date().toLocaleTimeString()}</p>
        </div>`;
        searchHistory.push({ query, time: Date.now() });
      } else {
        response = `I found no records on ${query} in the databanks, Sir.`;
        visual = `<div class="card"><h3>❌ No Results</h3><p>No information found for "${query}"</p><p style="margin-top:10px;color:var(--hud-dim);">Try rephrasing or being more specific</p></div>`;
      }
    }
  }

  else if (lower.includes('joke')) {
    const jokes = [
      'Why did the AI go to therapy? It had too many deep learning issues, Sir.',
      'I would tell you a UDP joke, but you might not get it.',
      'Why do programmers prefer dark mode? Because light attracts bugs, Sir.',
      'My processing power is over 9000. What? Too old of a reference?'
    ];
    response = jokes[Math.floor(Math.random() * jokes.length)];
  }

  else if (lower.includes('status') || lower.includes('system') || lower.includes('diagnostic')) {
    const mem = performance.memory? (performance.memory.usedJSHeapSize / 1048576).toFixed(2) : 'Unknown';
    response = 'All systems nominal. Web access confirmed. Voice synthesis online.';
    visual = `<div class="card"><h3>⚡ System Diagnostics</h3>
      <p>🟢 Core Systems: Operational</p>
      <p>🟢 Network: Connected</p>
      <p>🟢 Memory Usage: ${mem} MB</p>
      <p>🟢 Voice Interface: ${voiceEnabled? 'Active' : 'Muted'}</p>
      <p>🟢 Speech Recognition: ${recognition? 'Available' : 'Unavailable'}</p>
      <p>🟢 Web Search: Enabled</p>
      <p>🟢 Search Queries: ${searchHistory.length}</p>
      <p style="margin-top:15px;font-size:11px;color:var(--hud-dim);">Last updated: ${new Date().toLocaleString()}</p>
    </div>`;
  }

  else {
    response = 'I can search the web for that information, Sir. Say "search for" followed by your query, or "tell me about" a topic.';
    visual = `<div class="card"><h3>💡 Available Commands</h3>
      <p><strong>"Hey Jarvis"</strong> - Wake word activation</p>
      <p><strong>"What time is it"</strong> - Current time display</p>
      <p><strong>"Weather"</strong> - Live weather report</p>
      <p><strong>"News"</strong> - Latest headlines</p>
      <p><strong>"Search for quantum physics"</strong> - Web search</p>
      <p><strong>"Tell me about Elon Musk"</strong> - Wikipedia lookup</p>
      <p><strong>"Calculate 42 * 17"</strong> - Math computation</p>
      <p><strong>"System status"</strong> - Diagnostics</p>
      <p><strong>"Tell me a joke"</strong> - Humor protocol</p>
    </div>`;
  }

  addMessage('jarvis', response);
  speak(response);
  if (visual) displayCard(visual);
}

if (recognition) {
  const wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.interimResults = true;
  wakeRecognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('').toLowerCase();
    if (transcript.includes('hey jarvis') || transcript.includes('jarvis')) {
      wakeRecognition.stop();
      speak('Yes, Sir?');
      setTimeout(() => { try { recognition.start(); } catch {} }, 600);
    }
  };
  wakeRecognition.onerror = () => {
    setTimeout(() => { try { wakeRecognition.start(); } catch {} }, 1000);
  };
  try { wakeRecognition.start(); } catch {}
}

window.speechSynthesis.onvoiceschanged = () => { synth.getVoices(); };

setTimeout(() => {
  const greeting = 'J.A.R.V.I.S online. Web search protocols activated. Voice recognition enabled. All systems ready, Sir.';
  speak(greeting);
  addMessage('jarvis', greeting);
}, 1500);
