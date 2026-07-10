// 효과음 (Web Audio 합성, 오디오 파일 없음). 펫 렌더러에서 pet.js보다 먼저 로드한다.
// 설정 '효과음'(soundEnabled)이 켜져 있을 때만 실제로 소리를 낸다.

let soundEnabled = false;
let audioContext = null;

function setSoundEnabled(on) {
  soundEnabled = !!on;
}

// AudioContext는 첫 사용자 상호작용(클릭) 후에 만들어야 브라우저 자동재생 정책에 막히지 않는다.
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

// 사각파/삼각파 블립 하나. start(초 offset)에 freq로 시작해 dur 동안 짧은 감쇠 엔벨로프로 운다.
function blip(ctx, freq, start, dur, { type = "triangle", gain = 0.06 } = {}) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008); // 빠른 어택 (툭 하는 클릭음 방지)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // 지수 감쇠
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// 짧은 화이트노이즈 버퍼 (돌 부딪는 트랜지언트용).
function noiseBuffer(ctx, dur) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// 돌 두드리는 "톡": 부딪는 순간의 밴드패스 노이즈 + 아래로 떨어지는 짧은 울림.
function stoneTap(ctx, start) {
  const t0 = ctx.currentTime + start;

  // 1) 딱 하는 노이즈 트랜지언트 (돌끼리 부딪는 texture)
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 0.05);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3200; // 더 높은 대역 → 밝고 선명한 "딱"
  bp.Q.value = 1.4; // 초점을 좁혀 또렷하게
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t0);
  ng.gain.linearRampToValueAtTime(0.1, t0 + 0.001); // 더 날카로운 어택
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028); // 더 타이트한 감쇠
  src.connect(bp).connect(ng).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + 0.06);

  // 2) 돌의 짧은 울림 (하강 피치 → 단단히 얹히는 느낌)
  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(440, t0); // 더 높은 시작음 → 저역 뭉침 제거
  osc.frequency.exponentialRampToValueAtTime(280, t0 + 0.06);
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.linearRampToValueAtTime(0.05, t0 + 0.003);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07); // 짧은 꼬리
  osc.connect(og).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}

// 이벤트별 효과음 패턴.
const SOUND_PATTERNS = {
  // 펫 클릭: 두 번 부딪는 "또각"
  click: (ctx) => {
    stoneTap(ctx, 0);
    stoneTap(ctx, 0.09);
  },
  // 밥 주기·닦기(돌보기): 낮은 2음 상승
  care: (ctx) => {
    blip(ctx, 174.61, 0, 0.13, { gain: 0.075 });
    blip(ctx, 261.63, 0.12, 0.18, { gain: 0.075 });
  },
  // 진화: 저음역 상승 아르페지오
  evolve: (ctx) => {
    [130.81, 164.81, 196, 261.63].forEach((f, i) =>
      blip(ctx, f, i * 0.13, 0.22, { gain: 0.075 }),
    );
  },
};

function playSound(name) {
  if (!soundEnabled) return;
  const pattern = SOUND_PATTERNS[name];
  if (!pattern) return;
  try {
    pattern(getAudioContext());
  } catch (_err) {
    // 오디오 컨텍스트 생성 실패 등은 조용히 무시 (효과음은 부가 기능)
  }
}
