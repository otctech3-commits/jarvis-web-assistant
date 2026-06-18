const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

let listening = false;
let voiceEnabled = true;

// DOM Elements
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

// Clock
setInterval(() => {
  document.getElementById('timeDisplay').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}, 1000);

// Network status
netStatus.classList.add('active');

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
    speak('I did not catch that, Sir.');
  };
}

// Speak function
function speak(text) {
  if (!voiceEnabled) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 0.9;
  utterance.volume = 0.8;
  synth.speak(utterance);
}

// Add message to chat
function addMessage(sender, text) {
  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;
  msg.innerHTML = `<span class="msg-label">${sender}:</span>${text}`;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Display on visual screen
function displayCard(html) {
  screenContent.innerHTML = html;
}

// Core click
coreCenter.onclick = () => {
  if (!recognition) return alert('Speech recognition not supported in this browser');
  if (listening) recognition.stop();
  else recognition.start();
};

// Voice toggle
voiceBtn.onclick = () => {
  voiceEnabled =!voiceEnabled;
  voiceBtn.innerHTML = voiceEnabled? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
  speak(voiceEnabled? 'Voice enabled' : 'Voice disabled');
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

// Clear
clearBtn.onclick = () => {
  screenContent.innerHTML = '<div class="welcome-msg"><h2>Screen Cleared</h2><p>Ready for new commands</p></div>';
  chatLog.innerHTML = '';
};

// Command Processor - JARVIS Brain
async function processCommand(cmd) {
  const lower = cmd.toLowerCase();
  let response = '';
  let visual = '';

  // Greetings
  if (lower.includes('hey jarvis') || lower.includes('hello')) {
    response = 'At your service, Sir. How may I assist you today?';
  }

  // Time
  else if (lower.includes('time')) {
    const time = new Date().toLocaleTimeString();
    response = `The time is ${time}`;
    visual = `<div class="card"><div class="clock-display">${time}</div></div>`;
  }

  // Date
  else if (lower.includes('date') || lower.includes('day')) {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    response = `Today is ${date}`;
    visual = `<div class="card"><h3>📅 Date</h3><p>${date}</p></div>`;
  }

  // Weather - using free API
  else if (lower.includes('weather')) {
    response = 'Fetching weather data...';
    try {
      const res = await fetch('https://wttr.in/?format=j1');
      const data = await res.json();
      const current = data.current_condition[0];
      const temp = current.temp_C;
      const desc = current.weatherDesc[0].value;
      response = `Current weather: ${temp}°C, ${desc}`;
      visual = `<div class="card weather-card">
        <div class="weather-icon">🌤️</div>
        <div><h3>Weather</h3><p>${temp}°C - ${desc}</p><p>Humidity: ${current.humidity}%</p></div>
      </div>`;
    } catch {
      response = 'Unable to fetch weather data, Sir.';
    }
  }

  // Jokes
  else if (lower.includes('joke')) {
    const jokes = [
      'Why did the AI go to therapy? It had too many deep learning issues.',
      'I told my computer a joke about UDP. It did not get it.',
      'Why do programmers prefer dark mode? Because light attracts bugs.'
    ];
    response = jokes[Math.floor(Math.random() * jokes.length)];
  }

  // Calculations
  else if (lower.match(/(\d+)\s*[\+\-\*\/]\s*(\d+)/)) {
    try {
      const result = eval(lower.replace(/[^0-9+\-*/().]/g, ''));
      response = `The answer is ${result}`;
      visual = `<div class="card"><h3>Calculator</h3><p style="font-size:32px;">${result}</p></div>`;
    } catch {
      response = 'I could not calculate that, Sir.';
    }
  }

  // Search
  else if (lower.includes('search') || lower.includes('google')) {
    const query = cmd.replace(/search|google|for/gi, '').trim();
    response = `Searching for ${query}`;
    visual = `<div class="card"><h3>🔍 Search</h3><p>${query}</p><a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank" style="color:#00d9ff;">Open in Google →</a></div>`;
  }

  // System status
  else if (lower.includes('status')) {
    const mem = (performance.memory? (performance.memory.usedJSHeapSize / 1048576).toFixed(2) : 'N/A');
    response = 'All systems operational, Sir.';
    visual = `<div class="card"><h3>System Status</h3><p>Memory: ${mem} MB</p><p>Voice: ${voiceEnabled? 'Enabled' : 'Disabled'}</p><p>Connection: Online</p></div>`;
  }

  // Default AI response
  else {
    response = 'I am not sure how to help with that yet, Sir. Try asking about time, weather, or calculations.';
  }

  addMessage('jarvis', response);
  speak(response);
  if (visual) displayCard(visual);
}

// Wake word detection
if (recognition) {
  const wakeRecognition = new SpeechRecognition();
  wakeRecognition.continuous = true;
  wakeRecognition.onresult = (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.toLowerCase();
    if (transcript.includes('hey jarvis') || transcript.includes('jarvis')) {
      speak('Yes, Sir?');
      recognition.start();
    }
  };
  try { wakeRecognition.start(); } catch {}
}

// Initial greeting
setTimeout(() => {
  speak('Systems online. Good day, Sir.');
  addMessage('jarvis', 'Systems online. Good day, Sir.');
}, 1000);
