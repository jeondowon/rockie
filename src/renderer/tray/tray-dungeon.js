// 한 칸 던전: 탐험 중 보물은 임시 보관하고 귀환/완주 때만 조각을 지급한다.
let dungeonState = MiniGameRules.newDungeon();
let dungeonNextReady = false;
let dungeonLastCard = null;
let dungeonRoundId = null;
let dungeonSaving = false;
let dungeonSaved = false;
let dungeonSaveError = false;

function renderDungeon() {
  const state = dungeonState;
  const ended = state.status !== "playing";
  const shards = MiniGameRules.dungeonShards(state);
  document.getElementById("dungeon-floor").textContent = t("dungeon.floor", { floor: state.floor });
  document.getElementById("dungeon-loot").textContent = t("dungeon.loot", { count: state.treasure });
  const health = document.getElementById("dungeon-health");
  health.textContent = `♥ ${state.health} / ${MiniGameRules.DUNGEON_HEALTH}`;
  health.setAttribute("aria-label", t("dungeon.health"));
  health.setAttribute("aria-valuenow", state.health);
  health.classList.toggle("low-health", state.health <= 3);
  document.getElementById("dungeon-pet").src = spriteGifUrl(shopSprite.level, shopSprite.prefix, "smile");
  const message = document.getElementById("dungeon-message");
  message.textContent = ended ? t(`dungeon.${state.status}Message`) : dungeonLastCard
    ? t(dungeonLastCard.heal ? "dungeon.healed" : "dungeon.fought", {
      damage: dungeonLastCard.damage, loot: dungeonLastCard.loot, heal: dungeonLastCard.heal,
    }) : t("dungeon.choose");

  const cards = document.getElementById("dungeon-cards");
  cards.replaceChildren();
  cards.classList.toggle("hidden", ended);
  if (!ended) state.cards.forEach((card, index) => {
    const button = document.createElement("button");
    button.className = `dungeon-card ${card.type}`;
    button.disabled = dungeonNextReady;
    const icon = document.createElement("span");
    icon.className = "dungeon-card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = { monster: "⚔", treasure: "◆", heal: "♥" }[card.type];
    const name = document.createElement("strong");
    name.textContent = t(`dungeon.${card.type}`);
    const effect = document.createElement("span");
    effect.textContent = card.heal ? t("dungeon.cardHeal", { count: card.heal })
      : t("dungeon.cardDamage", { count: card.damage });
    const loot = document.createElement("small");
    loot.textContent = card.heal ? t("dungeon.rest") : t("dungeon.loot", { count: card.loot });
    if (card.damage >= state.health) {
      button.classList.add("lethal");
      loot.textContent = t("dungeon.lethal");
    }
    button.append(icon, name, effect, loot);
    button.addEventListener("click", () => selectDungeonCard(index));
    cards.append(button);
  });

  document.getElementById("dungeon-result").classList.toggle("hidden", !ended);
  document.getElementById("dungeon-result-title").textContent = ended ? t(`dungeon.${state.status}`) : "";
  document.getElementById("dungeon-result-detail").textContent = dungeonSaving ? t("arcade.saving")
    : t(dungeonSaved ? "dungeon.banked" : "dungeon.pending", { count: shards });
  document.getElementById("dungeon-retreat").classList.toggle("hidden", ended);
  document.getElementById("dungeon-retreat").textContent = t("dungeon.retreatWith", { count: shards });
  document.getElementById("dungeon-next").classList.toggle("hidden", ended || !dungeonNextReady);
  document.getElementById("dungeon-restart").classList.toggle("hidden", !ended && dungeonNextReady);
  document.getElementById("dungeon-restart").disabled = dungeonSaving || (ended && !dungeonSaved);
  document.getElementById("dungeon-retry").classList.toggle("hidden", !dungeonSaveError);
  document.getElementById("dungeon-error").textContent = dungeonSaveError ? t("arcade.saveError") : "";
  if (typeof miniGameWindowHeight === "function" &&
    !document.getElementById("dungeon-view").classList.contains("hidden"))
    window.trayAPI.resizePopup(miniGameWindowHeight("dungeon"));
}

function selectDungeonCard(index) {
  if (dungeonNextReady || dungeonState.status !== "playing") return;
  dungeonLastCard = MiniGameRules.chooseDungeonCard(dungeonState, index);
  if (!dungeonLastCard) return;
  dungeonNextReady = true;
  renderDungeon();
  if (dungeonState.status !== "playing") saveDungeonReward();
}

async function saveDungeonReward() {
  if (dungeonSaving || dungeonSaved || dungeonState.status === "playing") return;
  dungeonSaving = true;
  dungeonSaveError = false;
  renderDungeon();
  try {
    const shards = MiniGameRules.dungeonShards(dungeonState);
    if (shards > 0) {
      if (!dungeonRoundId) dungeonRoundId = await window.trayAPI.startGame("dungeon");
      renderEconomy(await window.trayAPI.reportGameScore(dungeonRoundId, shards * 250));
    }
    dungeonSaved = true;
  } catch {
    dungeonSaveError = true;
  } finally {
    dungeonSaving = false;
    renderDungeon();
  }
}

function restartDungeon() {
  if (dungeonSaving || (dungeonState.status !== "playing" && !dungeonSaved)) return;
  dungeonState = MiniGameRules.newDungeon();
  dungeonNextReady = false;
  dungeonLastCard = null;
  dungeonRoundId = null;
  dungeonSaved = false;
  dungeonSaveError = false;
  renderDungeon();
}

document.getElementById("dungeon-next").addEventListener("click", () => {
  dungeonNextReady = false;
  dungeonLastCard = null;
  renderDungeon();
});
document.getElementById("dungeon-retreat").addEventListener("click", () => {
  MiniGameRules.retreatDungeon(dungeonState);
  saveDungeonReward();
});
document.getElementById("dungeon-restart").addEventListener("click", () => {
  if (dungeonState.status !== "playing") restartDungeon();
  else showConfirm({
    title: t("confirm.gameRestartTitle"), desc: t("dungeon.restartConfirm"),
    okLabel: t("game.restart"), onOk: restartDungeon,
  });
});
document.getElementById("dungeon-retry").addEventListener("click", saveDungeonReward);
onLocaleChange(renderDungeon);
window.trayAPI.onPetDisplaySprite(() => renderDungeon());
renderDungeon();
