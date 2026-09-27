// 가격과 소유 상태는 메인에서 받아 표시하고, 구매·장착 결과를 두 탭에 함께 반영한다.
let economyState = null;
let shopBusy = false;
let shopSprite = { level: "level0", prefix: "rockie" };

function updateShopSprite(sprite) {
  if (
    !sprite ||
    (shopSprite.level === sprite.level && shopSprite.prefix === sprite.prefix)
  ) return;
  shopSprite = { level: sprite.level, prefix: sprite.prefix };
  if (economyState) renderEconomy(economyState);
}

const shopTabs = [...document.querySelectorAll('.shop-tabs [role="tab"]')];

function selectShopTab(selected) {
  for (const tab of shopTabs) {
    const active = tab === selected;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    document
      .getElementById(tab.getAttribute("aria-controls"))
      .classList.toggle("hidden", !active);
  }
  document.getElementById("shop-feedback").classList.add("hidden");
}

shopTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectShopTab(tab));
  tab.addEventListener("keydown", (event) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % shopTabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + shopTabs.length - 1) % shopTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = shopTabs.length - 1;
    else return;
    event.preventDefault();
    selectShopTab(shopTabs[next]);
    shopTabs[next].focus();
  });
});

function showShopFeedback(key) {
  const node = document.getElementById("shop-feedback");
  node.textContent = t(key);
  node.classList.remove("hidden");
}

function renderEconomy(state) {
  economyState = state;
  for (const node of document.querySelectorAll("[data-shard-balance]")) {
    node.textContent = t("shop.balance", { count: state.shards });
  }
  renderShopItems(false);
  renderShopItems(true);
}

async function refreshEconomy() {
  try {
    const [state, sprite] = await Promise.all([
      window.trayAPI.getEconomy(),
      window.trayAPI.getPetDisplaySprite().catch(() => null),
    ]);
    // 함께 받은 상태로 두 탭을 한 번만 다시 그린다.
    if (sprite) shopSprite = { level: sprite.level, prefix: sprite.prefix };
    renderEconomy(state);
  } catch {
    showShopFeedback("shop.error");
  }
}

async function changeShopItem(action, showSuccess = false) {
  if (shopBusy) return;
  shopBusy = true;
  document.getElementById("shop-feedback").classList.add("hidden");
  renderEconomy(economyState);
  try {
    const result = await action();
    if (result.error) showShopFeedback(`shop.${result.error}`);
    else {
      renderEconomy(result.state);
      if (showSuccess) showShopFeedback("shop.saved");
    }
  } catch {
    showShopFeedback("shop.error");
  } finally {
    shopBusy = false;
    renderEconomy(economyState);
  }
}

function itemPreview(item) {
  const preview = document.createElement("div");
  preview.className = "shop-preview";
  const canvas = document.createElement("div");
  canvas.className = "shop-pet";
  // 카드에서는 몸 너비를 32px로 맞춰 큰 보석과 주변 장식도 미리보기 안에 담는다.
  const anchors =
    CHARACTER_ATTACHMENTS[shopSprite.prefix] || CHARACTER_ATTACHMENTS.rockie;
  const previewSize = (32 * 320) / anchors.body.width;
  canvas.style.width = previewSize + "px";
  canvas.style.height = previewSize + "px";
  const rock = document.createElement("img");
  rock.src = spriteGifUrl(shopSprite.level, shopSprite.prefix, "smile");
  rock.alt = "";
  canvas.append(rock);
  preview.append(canvas);
  if (item.kind === "theme") preview.dataset.theme = item.id;
  else {
    const decoration = document.createElement("img");
    decoration.src = `../../../assets/decorations/${item.id}.svg`;
    decoration.alt = "";
    placeAttachment(decoration, shopSprite.prefix, item.id, previewSize);
    canvas.append(decoration);
  }
  return preview;
}

function renderShopItems(inventory) {
  const root = document.getElementById(
    inventory ? "inventory-items" : "shop-items",
  );
  root.replaceChildren();
  for (const kind of ["decoration", "theme"]) {
    const title = document.createElement("h2");
    title.className = "shop-category";
    title.textContent = t(`shop.${kind}`);
    const heading = document.createElement("div");
    heading.className = "shop-category-head";
    heading.append(title);
    root.append(heading);
    if (inventory && kind === "decoration" && economyState[kind]) {
      const clear = document.createElement("button");
      clear.className = "shop-default";
      clear.textContent = t("shop.unequip");
      clear.disabled = shopBusy;
      clear.addEventListener("click", () =>
        changeShopItem(() => window.trayAPI.equipItem(kind, null)),
      );
      heading.append(clear);
    }
    const items = economyState.catalog.filter(
      (item) =>
        item.kind === kind &&
        (!inventory || economyState.owned.includes(item.id)),
    );
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "shop-empty";
      empty.textContent = t("inventory.empty");
      root.append(empty);
      continue;
    }
    const grid = document.createElement("div");
    grid.className = "shop-grid";
    for (const item of items) {
      const card = document.createElement("article");
      card.className = "shop-card";
      card.append(itemPreview(item));
      const name = document.createElement("h3");
      name.textContent = t(`item.${item.id}`);
      card.title = t(`item.${item.id}.desc`);
      const price = document.createElement("p");
      price.className = "shop-price";
      price.textContent = t("shop.balance", { count: item.price });
      const button = document.createElement("button");
      const owned = economyState.owned.includes(item.id);
      const equipped = economyState[kind] === item.id;
      card.classList.toggle("is-equipped", equipped);
      if (inventory) price.textContent = t("shop.owned");
      button.textContent = inventory
        ? t(
            kind === "theme"
              ? "shop.unavailable"
              : equipped
                ? "shop.equipped"
                : "shop.equip",
          )
        : owned
          ? t(equipped ? "shop.equipped" : "shop.owned")
          : t("shop.purchase");
      button.setAttribute("aria-label", `${name.textContent} · ${button.textContent}`);
      button.disabled =
        shopBusy ||
        (inventory
          ? kind === "theme" || equipped
          : owned || economyState.shards < item.price);
      if (!inventory && !owned && economyState.shards < item.price)
        button.title = t("shop.insufficient");
      button.addEventListener("click", () => {
        if (inventory)
          changeShopItem(() => window.trayAPI.equipItem(kind, item.id));
        else
          showConfirm({
            title: t("shop.confirmTitle"),
            desc: t("shop.confirmDesc", {
              name: t(`item.${item.id}`),
              price: item.price,
            }),
            okLabel: t("shop.buy", { price: item.price }),
            onOk: () => changeShopItem(() => window.trayAPI.buyItem(item.id), true),
          });
      });
      card.append(name, price, button);
      grid.append(card);
    }
    root.append(grid);
  }
}

window.trayAPI.onEconomyChanged(renderEconomy);
window.trayAPI.onPetDisplaySprite(updateShopSprite);
onLocaleChange(() => {
  if (economyState) renderEconomy(economyState);
  document.getElementById("shop-feedback").classList.add("hidden");
});
refreshEconomy();
