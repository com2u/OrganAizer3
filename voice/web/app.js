/*
 * OrganAIzer web voice client.
 *
 * Responsibilities:
 *  - Fetch a LiveKit access token from the local token server.
 *  - Establish a realtime audio session (join room, publish mic, play agent).
 *  - Toggle between "Voice" and "Muted" dialog modes.
 *  - Visualise the live audio level of both the user and the assistant.
 *  - End the session gracefully.
 */

const { Room, RoomEvent, Track, createAudioAnalyser } = LivekitClient;

const els = {
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  callButton: document.getElementById("callButton"),
  modeToggle: document.getElementById("modeToggle"),
  modeText: document.getElementById("modeText"),
  modeHint: document.getElementById("modeHint"),
  userLevel: document.getElementById("userLevel"),
  agentLevel: document.getElementById("agentLevel"),
  agentAudio: document.getElementById("agentAudio"),
  log: document.getElementById("log"),
};

let room = null;
let voiceMode = true; // true = Voice (mic live), false = Muted
let userAnalyser = null;
let agentAnalyser = null;
let meterRaf = null;

function log(message) {
  const time = new Date().toLocaleTimeString();
  els.log.textContent += `[${time}] ${message}\n`;
  els.log.parentElement.scrollTop = els.log.parentElement.scrollHeight;
}

function setStatus(state, text) {
  els.statusDot.className = `dot dot--${state}`;
  els.statusText.textContent = text;
}

function setConnectedUI(connected) {
  els.modeToggle.disabled = !connected;
  els.callButton.textContent = connected ? "End conversation" : "Start conversation";
  els.callButton.className = connected
    ? "call-button call-button--end"
    : "call-button call-button--start";
}

// ---- Audio level metering ---------------------------------------------------

function startMeters() {
  const update = () => {
    if (userAnalyser) {
      els.userLevel.style.width = `${Math.min(100, userAnalyser.calculateVolume() * 140)}%`;
    }
    if (agentAnalyser) {
      els.agentLevel.style.width = `${Math.min(100, agentAnalyser.calculateVolume() * 140)}%`;
    }
    meterRaf = requestAnimationFrame(update);
  };
  update();
}

function stopMeters() {
  if (meterRaf) cancelAnimationFrame(meterRaf);
  meterRaf = null;
  userAnalyser?.cleanup?.();
  agentAnalyser?.cleanup?.();
  userAnalyser = null;
  agentAnalyser = null;
  els.userLevel.style.width = "0%";
  els.agentLevel.style.width = "0%";
}

// ---- Session lifecycle ------------------------------------------------------

async function connect() {
  try {
    setStatus("connecting", "Connecting...");
    log("Requesting access token...");

    const res = await fetch("/api/token");
    if (!res.ok) throw new Error(`Token request failed (${res.status})`);
    const { token, url, room: roomName } = await res.json();
    log(`Joining room "${roomName}"...`);

    room = new Room();

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        track.attach(els.agentAudio);
        agentAnalyser = createAudioAnalyser(track);
        log("Assistant audio connected.");
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      log("Session ended.");
      teardown();
    });

    await room.connect(url, token);
    setStatus("live", "Connected");
    log("Connected. Enabling microphone...");

    await room.localParticipant.setMicrophoneEnabled(true);
    const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (micPub?.track) {
      userAnalyser = createAudioAnalyser(micPub.track);
    }

    voiceMode = true;
    updateModeUI();
    startMeters();
    setConnectedUI(true);
    log("Voice dialog active. The assistant will greet you shortly.");
  } catch (err) {
    log(`Error: ${err.message}`);
    setStatus("error", "Connection failed");
    await teardown();
  }
}

async function disconnect() {
  log("Ending conversation...");
  if (room) await room.disconnect();
  teardown();
}

function teardown() {
  stopMeters();
  if (room) {
    room.removeAllListeners();
    room = null;
  }
  setConnectedUI(false);
  setStatus("idle", "Not connected");
}

// ---- Mode toggle ------------------------------------------------------------

async function toggleMode() {
  if (!room) return;
  voiceMode = !voiceMode;
  await room.localParticipant.setMicrophoneEnabled(voiceMode);
  updateModeUI();
  log(voiceMode ? "Voice mode: microphone live." : "Muted: microphone off.");
}

function updateModeUI() {
  els.modeText.textContent = voiceMode ? "Voice" : "Muted";
  els.modeHint.textContent = voiceMode ? "Voice dialog active" : "Microphone muted";
  els.modeToggle.classList.toggle("mode-toggle--muted", !voiceMode);
}

// ---- Wiring -----------------------------------------------------------------

els.callButton.addEventListener("click", () => {
  if (room) disconnect();
  else connect();
});
els.modeToggle.addEventListener("click", toggleMode);

setConnectedUI(false);
log("Ready. Click \"Start conversation\" to talk to OrganAIzer.");
