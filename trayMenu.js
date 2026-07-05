const menuView = document.getElementById("menu-view");
const petView = document.getElementById("pet-view");
const petBody = document.getElementById("pet-body");
const settingsView = document.getElementById("settings-view");
const permToggle = document.getElementById("perm-toggle");
const permHint = document.getElementById("perm-hint");

const DEFAULT_HINT = "활성 앱 감지(말풍선)에 필요합니다.";

const STONE_NAMES = {
  granite: "화강암",
  basalt: "현무암",
  marble: "대리석",
  gneiss: "편마암",
};

function hideAllViews() {
  menuView.classList.add("hidden");
  petView.classList.add("hidden");
  settingsView.classList.add("hidden");
}

function showMenu() {
  hideAllViews();
  menuView.classList.remove("hidden");
}

function showSettings() {
  hideAllViews();
  settingsView.classList.remove("hidden");
  permHint.textContent = DEFAULT_HINT;
  refreshPermToggle();
}

async function showPet() {
  hideAllViews();
  petView.classList.remove("hidden");
  renderPet(await window.trayAPI.getEvolutionState());
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function renderPet(state) {
  petBody.innerHTML = "";

  // 이미 돌 종류가 확정됨 → 결과 표시
  if (state.stoneType) {
    petBody.appendChild(el("p", "petmsg", `${STONE_NAMES[state.stoneType]}(으)로 진화했어요!`));
    petBody.appendChild(el("p", "hint", "다음 진화 단계는 준비 중이에요."));
    return;
  }

  // 아직 판정 중 → 진행도 + 다음 질문 카드
  petBody.appendChild(el("p", "progress", `질문 ${state.progress} / ${state.total}`));

  const q = state.question;
  if (!q) {
    petBody.appendChild(el("p", "hint", "지금은 답할 질문이 없어요."));
    return;
  }
  if (q.kind === "tiebreaker") {
    petBody.appendChild(el("p", "hint", "마지막으로 하나만 더 골라주세요!"));
  }
  petBody.appendChild(el("p", "question", q.text));

  const options = el("div", "options");
  q.options.forEach((opt) => {
    const btn = el("button", "option", opt.label);
    btn.addEventListener("click", () => answerQuestion(q.id, opt.stone));
    options.appendChild(btn);
  });
  petBody.appendChild(options);
}

async function answerQuestion(questionId, stone) {
  const result = await window.trayAPI.answerQuestion({ questionId, stone });
  renderPet(result.state);
}

function setToggle(granted) {
  permToggle.classList.toggle("on", granted);
  permToggle.textContent = granted ? "ON" : "OFF";
}

async function refreshPermToggle() {
  const status = await window.trayAPI.getScreenPermission();
  setToggle(status === "granted");
}

document.querySelectorAll(".item").forEach((item) => {
  item.addEventListener("click", () => {
    const action = item.dataset.action;
    if (action === "status") {
      showPet(); // 메인에 보낼 동작은 없고 뷰만 전환한다
      return;
    }
    window.trayAPI.sendAction(action);
    if (action === "settings") showSettings();
  });
});

document.getElementById("back").addEventListener("click", showMenu);
document.getElementById("pet-back").addEventListener("click", showMenu);

permToggle.addEventListener("click", async () => {
  const status = await window.trayAPI.getScreenPermission();

  if (status === "granted") {
    // macOS는 권한을 코드로 해제할 수 없다
    permHint.textContent =
      "해제는 시스템 설정 > 개인정보 보호 및 보안 > 화면 기록에서만 가능합니다.";
    return;
  }

  // 시스템 권한 팝업 유도 (이미 거부된 상태면 macOS가 다시 띄우지 않음)
  const after = await window.trayAPI.requestScreenPermission();
  setToggle(after === "granted");
  if (after !== "granted") {
    permHint.textContent =
      "권한 요청이 거부된 상태입니다. 시스템 설정 > 화면 기록에서 직접 허용해 주세요.";
  }
});

// 팝업이 열릴 때마다 메뉴 뷰로 초기화하고 권한 상태를 갱신
window.trayAPI.onWillShow(() => {
  showMenu();
  refreshPermToggle();
});
