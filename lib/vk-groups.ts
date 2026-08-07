import type { BoardKind } from "@prisma/client";

export type VkGroupConfig = {
  screenName: string;
  kind: BoardKind;
};

/** Стартовый список групп — позже можно расширять */
export const VK_BOARD_GROUPS: VkGroupConfig[] = [
  { screenName: "poputchiki_rm", kind: "RIDES" },
  { screenName: "dehevlezubova", kind: "RIDES" },
  { screenName: "poputgruz", kind: "CARGO" },
  { screenName: "zakazgruz", kind: "CARGO" },
];
