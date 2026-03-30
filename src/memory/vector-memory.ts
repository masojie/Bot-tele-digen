import { ChromaClient } from 'chromadb';

export class VectorMemory {
  private client: ChromaClient;
  private collection: any;
  private initialized = false;
  private localMemory: any[] = [];

  async init() {
    if (this.initialized) return;
    try {
      this.client = new ChromaClient();
      this.collection = await this.client.getOrCreateCollection({
        name: "trading_memory",
        metadata: { "hnsw:space": "cosine" }
      });
      this.initialized = true;
      console.log('✅ VectorMemory initialized');
    } catch (err) {
      console.log('⚠️ Using local memory fallback');
      this.initialized = true;
    }
  }

  async remember(token: any, outcome: any) {
    if (!this.initialized) return;
    const record = {
      id: token.mint + '_' + Date.now(),
      embedding: this.getEmbedding(token),
      metadata: {
        symbol: token.symbol,
        outcome: outcome.profit || 0,
        timestamp: Date.now(),
        priceChange: token.priceChange1h,
        volume: token.volumeUSD1h,
        liquidity: token.liquidityUSD
      }
    };
    try {
      if (this.collection) {
        await this.collection.add({
          ids: [record.id],
          embeddings: [record.embedding],
          metadatas: [record.metadata]
        });
      } else {
        this.localMemory.push(record);
        if (this.localMemory.length > 1000) this.localMemory.shift();
      }
    } catch (err) {}
  }

  async recallSimilar(token: any, limit: number = 10) {
    if (!this.initialized) return [];
    const queryEmbedding = this.getEmbedding(token);
    try {
      if (this.collection) {
        const results = await this.collection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: limit
        });
        return results.metadatas?.[0] || [];
      } else {
        const similarities = this.localMemory.map(record => ({
          metadata: record.metadata,
          similarity: this.cosineSimilarity(queryEmbedding, record.embedding)
        }));
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities.slice(0, limit).map(s => s.metadata);
      }
    } catch (err) {
      return [];
    }
  }

  private getEmbedding(token: any): number[] {
    return [
      (token.priceChange1h || 0) / 100,
      (token.volumeUSD1h || 0) / 1000000,
      (token.liquidityUSD || 0) / 1000000,
      (token.botRiskScore || 0),
      (token.txns_buy_5m || 0) / 100
    ];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
}
