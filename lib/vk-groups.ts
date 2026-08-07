import type { BoardKind } from "@prisma/client";

export type VkGroupConfig = {
  screenName: string;
  kind: BoardKind;
};

/** Стартовый список групп — позже можно расширять */
export const VK_BOARD_GROUPS: VkGroupConfig[] = [
  { screenName: "poputchiki_rm", kind: "RIDES" },
  { screenName: "poputchik_rm", kind: "RIDES" },
  { screenName: "dehevlezubova", kind: "RIDES" },
  { screenName: "poputchiki_ulan_ude_irkutsk", kind: "RIDES" },
  { screenName: "club20062355", kind: "RIDES" },
  { screenName: "kazancheb", kind: "RIDES" },
  { screenName: "poputchiki_cheboksary_moskva", kind: "RIDES" },
  { screenName: "poputgruz", kind: "CARGO" },
  { screenName: "zakazgruz", kind: "CARGO" },
  { screenName: "gruzoperevozki_cheboksar", kind: "CARGO" },
];
