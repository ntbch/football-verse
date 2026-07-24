import type { Player } from "./_types";

export const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const overall = (player: Player) => Math.round(Object.values(player.attributes).reduce((sum, value) => sum + value, 0) /
  Math.max(1, Object.keys(player.attributes).length));
