import { describe, expect, it } from "vitest";

import {
  DcaPlugin,
  type DcaConfig,
} from "../../src/server/plugins/dca";

const config: DcaConfig = {
  enabled: true,
  symbol: "BTCUSDT",

  orderCount: 3,

  orders: [
    {
      id: 1,
      percentage: 2,
      enabled: true,
    },
    {
      id: 2,
      percentage: 5,
      enabled: true,
    },
    {
      id: 3,
      percentage: 10,
      enabled: true,
    },
  ],

  useMinimumExchangeAmount: true,
};

describe("DCA plugin", () => {
  it("calculates all DCA prices from initial entry", () => {
    const plugin = new DcaPlugin(config);

    const prices =
      plugin
        .getEngine()
        .calculatePrices(100);

    expect(prices).toEqual([
      {
        orderId: 1,
        percentage: 2,
        price: 98,
      },
      {
        orderId: 2,
        percentage: 5,
        price: 95,
      },
      {
        orderId: 3,
        percentage: 10,
        price: 90,
      },
    ]);
  });

  it("uses exchange minimum as default amount", () => {
    const plugin = new DcaPlugin(config);

    expect(
      plugin
        .getEngine()
        .getMinimumOrderAmount(5),
    ).toEqual({
      buyAmount: 5,
      sellAmount: 5,
    });
  });

  it("allows configuration to be changed at runtime", () => {
    const plugin = new DcaPlugin(config);

    plugin.updateConfig({
      ...config,

      orderCount: 2,

      orders: [
        {
          id: 1,
          percentage: 3,
          enabled: true,
        },
        {
          id: 2,
          percentage: 7,
          enabled: true,
        },
      ],
    });

    expect(
      plugin
        .getEngine()
        .calculatePrices(100),
    ).toEqual([
      {
        orderId: 1,
        percentage: 3,
        price: 97,
      },
      {
        orderId: 2,
        percentage: 7,
        price: 93,
      },
    ]);
  });
});
