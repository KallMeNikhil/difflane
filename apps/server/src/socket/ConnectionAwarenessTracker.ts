export class ConnectionAwarenessTracker {
  private readonly clientIdsBySocket = new Map<string, Set<number>>();

  track(socketId: string, clientIds: number[]): void {
    if (clientIds.length === 0) {
      return;
    }
    const existing = this.clientIdsBySocket.get(socketId) ?? new Set<number>();
    clientIds.forEach((id) => existing.add(id));
    this.clientIdsBySocket.set(socketId, existing);
  }

  consume(socketId: string): number[] {
    const existing = this.clientIdsBySocket.get(socketId);
    this.clientIdsBySocket.delete(socketId);
    return existing ? Array.from(existing) : [];
  }
}
