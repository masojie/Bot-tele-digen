import axios from 'axios';

export class ListingScanner {
  async scan(): Promise<any[]> {
    try {
      // Data dummy untuk monitoring
      return [
        {
          symbol: 'BONK',
          score: 0.75,
          action: 'ALERT',
          solanaMint: 'De89f5nQj5b8s7K3xLp9vN2mR6tY1wB4hJ7kL1pZ9xK8qX',
          positionMultiplier: 1.0
        },
        {
          symbol: 'WIF',
          score: 0.65,
          action: 'WATCH',
          solanaMint: 'EKpQGSJtj5qBv5xG5n5xZk9nY8xK7qX3Lp9vN2mR6tY1wB',
          positionMultiplier: 0.8
        }
      ];
    } catch (error) {
      return [];
    }
  }
}
