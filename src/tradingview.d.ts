// src/tradingview.d.ts

declare global {
  interface Window {
    TradingView: any; // Use 'any' or a more specific type if known
    Datafeeds: any;
  }
}

export {};
