export class RLTradingAgent {
  private qTable: Map<string, number[]> = new Map();
  private learningRate: number = 0.01;
  private discountFactor: number = 0.95;
  private epsilon: number = 0.1;

  getStateKey(token: any, portfolio: any): string {
    const priceChangeBin = Math.floor((token.priceChange1h || 0) / 10);
    const volumeBin = Math.floor((token.volumeUSD1h || 0) / 100000);
    const liquidityBin = Math.floor((token.liquidityUSD || 0) / 50000);
    const botRiskBin = Math.floor((token.botRiskScore || 0) * 10);
    return `${priceChangeBin}:${volumeBin}:${liquidityBin}:${botRiskBin}`;
  }

  getAction(stateKey: string): number {
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, [0, 0, 0]);
    }
    const qValues = this.qTable.get(stateKey)!;
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * 3);
    }
    return qValues.indexOf(Math.max(...qValues));
  }

  update(stateKey: string, action: number, reward: number, nextStateKey: string) {
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, [0, 0, 0]);
    }
    if (!this.qTable.has(nextStateKey)) {
      this.qTable.set(nextStateKey, [0, 0, 0]);
    }
    const qValues = this.qTable.get(stateKey)!;
    const nextQValues = this.qTable.get(nextStateKey)!;
    const maxNextQ = Math.max(...nextQValues);
    qValues[action] += this.learningRate * (reward + this.discountFactor * maxNextQ - qValues[action]);
  }

  getActionName(action: number): string {
    return ['BUY', 'SELL', 'HOLD'][action];
  }
}
