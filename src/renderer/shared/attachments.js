// 장식 배치: 모든 좌표·너비는 320×320 캐릭터 캔버스 기준.
// head=머리 위, side=머리 옆, body=몸 중심. width는 각 장착 영역의 기준 너비.
// smile 원본을 보고 잡은 초기값. pet.js의 PREVIEW 튜너에서 캐릭터별로 조정한다.

const CHARACTER_ATTACHMENTS = {
  rockie: {
    head: {
      x: 155,
      y: 120,
      width: 80,
    },
    side: {
      x: 200,
      y: 120,
      width: 110,
    },
    body: {
      x: 155,
      y: 160,
      width: 130,
    },
  },
  granite: {
    head: {
      x: 155,
      y: 110,
      width: 85,
    },
    side: {
      x: 200,
      y: 120,
      width: 110,
    },
    body: {
      x: 155,
      y: 160,
      width: 130,
    },
  },
  basalt: {
    head: {
      x: 155,
      y: 110,
      width: 80,
    },
    side: {
      x: 200,
      y: 120,
      width: 110,
    },
    body: {
      x: 155,
      y: 160,
      width: 130,
    },
  },
  marble: {
    head: {
      x: 155,
      y: 110,
      width: 80,
    },
    side: {
      x: 200,
      y: 120,
      width: 110,
    },
    body: {
      x: 155,
      y: 160,
      width: 130,
    },
  },
  gneiss: {
    head: {
      x: 155,
      y: 110,
      width: 80,
    },
    side: {
      x: 200,
      y: 120,
      width: 120,
    },
    body: {
      x: 155,
      y: 160,
      width: 130,
    },
  },
  pegmatite_e: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  pegmatite_i: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  eclogite_e: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  eclogite_i: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  corundumMarble_e: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  corundumMarble_i: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  migmatite_e: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  migmatite_i: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  topaz: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 205,
      y: 105,
      width: 100,
    },
    body: {
      x: 160,
      y: 155,
      width: 140,
    },
  },
  aquamarine: {
    head: {
      x: 160,
      y: 90,
      width: 100,
    },
    side: {
      x: 205,
      y: 110,
      width: 110,
    },
    body: {
      x: 160,
      y: 160,
      width: 140,
    },
  },
  diamond_cut: {
    head: {
      x: 160,
      y: 81,
      width: 110,
    },
    side: {
      x: 215,
      y: 110,
      width: 130,
    },
    body: {
      x: 160,
      y: 155,
      width: 180,
    },
  },
  diamond_rough: {
    head: {
      x: 155,
      y: 90,
      width: 110,
    },
    side: {
      x: 210,
      y: 110,
      width: 130,
    },
    body: {
      x: 155,
      y: 160,
      width: 190,
    },
  },
  partiSapphire: {
    head: {
      x: 160,
      y: 90,
      width: 105,
    },
    side: {
      x: 215,
      y: 110,
      width: 140,
    },
    body: {
      x: 160,
      y: 160,
      width: 160,
    },
  },
  ruby: {
    head: {
      x: 155,
      y: 91,
      width: 110,
    },
    side: {
      x: 225,
      y: 120,
      width: 160,
    },
    body: {
      x: 155,
      y: 160,
      width: 210,
    },
  },
  labradorite: {
    head: {
      x: 155,
      y: 80,
      width: 100,
    },
    side: {
      x: 205,
      y: 105,
      width: 120,
    },
    body: {
      x: 155,
      y: 160,
      width: 150,
    },
  },
  moonstone: {
    head: {
      x: 155,
      y: 80,
      width: 100,
    },
    side: {
      x: 205,
      y: 105,
      width: 120,
    },
    body: {
      x: 155,
      y: 160,
      width: 150,
    },
  },
};

// x/y=SVG의 붙는 지점, width=장식 자체 너비, scale=장착 영역 대비 너비 비율.
// SVG viewBox는 80×80이므로 SVG 좌표에 4를 곱해 기록한다.
const ITEM_ATTACHMENTS = {
  "star-halo": { slot: "body", x: 160, y: 160, width: 240, scale: 1.85 },
  "flower-ring": { slot: "side", x: 204, y: 120, width: 72, scale: 0.65 },
  "leaf-sprout": { slot: "head", x: 160, y: 112, width: 96, scale: 0.85 },
  "red-ribbon": { slot: "side", x: 204, y: 120, width: 72, scale: 0.65 },
  "tiny-crown": { slot: "head", x: 160, y: 120, width: 96, scale: 0.85 },
  "wizard-hat": { slot: "head", x: 160, y: 124, width: 120, scale: 1.05 },
  "bunny-ears": { slot: "head", x: 160, y: 120, width: 96, scale: 0.85 },
  "bear-ears": { slot: "head", x: 160, y: 124, width: 128, scale: 1.1 },
  "party-hat": { slot: "head", x: 160, y: 124, width: 88, scale: 0.8 },
  "straw-hat": { slot: "head", x: 160, y: 124, width: 152, scale: 1.35 },
  "heart-pin": { slot: "side", x: 204, y: 120, width: 64, scale: 0.58 },
  "lucky-clover": { slot: "side", x: 200, y: 116, width: 64, scale: 0.58 },
};

// 특정 캐릭터·아이템만 따로 조정할 때 사용하는 장착 기준점.
const CHARACTER_ITEM_ATTACHMENTS = {
  rockie: {
    "leaf-sprout": {
      x: 153,
      y: 112,
      width: 80,
    },
  },
};

function attachmentAnchor(prefix, itemId) {
  const character = CHARACTER_ATTACHMENTS[prefix] || CHARACTER_ATTACHMENTS.rockie;
  return CHARACTER_ITEM_ATTACHMENTS[prefix]?.[itemId] || character[ITEM_ATTACHMENTS[itemId].slot];
}

function attachmentLayout(prefix, itemId, canvasSize) {
  const item = ITEM_ATTACHMENTS[itemId];
  if (!item) return null;
  const anchor = attachmentAnchor(prefix, itemId);
  const k = canvasSize / 320;
  const scale = (anchor.width * item.scale) / item.width;
  return {
    left: (anchor.x - item.x * scale) * k,
    top: (anchor.y - item.y * scale) * k,
    size: canvasSize * scale,
  };
}

function placeAttachment(image, prefix, itemId, canvasSize) {
  const layout = attachmentLayout(prefix, itemId, canvasSize);
  if (!layout) return;
  image.style.left = layout.left + "px";
  image.style.top = layout.top + "px";
  image.style.width = layout.size + "px";
  image.style.height = layout.size + "px";
}
