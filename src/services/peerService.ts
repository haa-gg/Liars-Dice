import { Peer, DataConnection } from 'peerjs';

// Generate a short, readable room code
const generateRoomCode = (length = 6): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

class PeerService {
    peer: Peer | null = null;
    connections: Record<string, DataConnection> = {};
    onMessageCallback: ((id: string, data: any) => void) | null = null;
    onConnectionCallback: ((conn: DataConnection) => void) | null = null;
    onDisconnectedCallback: ((id: string) => void) | null = null;
    onReconnectCallback: (() => void) | null = null;

    constructor() {
        this.peer = null;
        this.connections = {};
        this.onMessageCallback = null;
        this.onConnectionCallback = null;
        this.onDisconnectedCallback = null;
    }

    async init(id: string | null = null, retries: number = 3): Promise<string> {
        if (this.peer) {
            console.log('Destroying existing peer instance...');
            this.peer.removeAllListeners();
            this.peer.destroy();
            // Brief delay to allow WebSocket closure before opening a new one
            await new Promise(r => setTimeout(r, 100));
        }

        // Generate a short room code if no ID provided
        const roomId = id || generateRoomCode(6);

        console.log(`Initializing PeerJS with ID: ${roomId} (Retries left: ${retries})`);
        this.peer = new Peer(roomId, {
            debug: 2, // Increased for better troubleshooting
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { 
                        urls: [
                            'turn:turn.anyfirewall.com:3478?transport=udp',
                            'turn:turn.anyfirewall.com:3478?transport=tcp'
                        ], 
                        username: 'webrtc', 
                        credential: 'webrtc' 
                    }
                ],
                iceCandidatePoolSize: 10
            }
        });

        this.peer.on('connection', (conn: DataConnection) => {
            console.log('Incoming connection from:', conn.peer);
            this._setupConnection(conn);
        });

        this.peer.on('disconnected', () => {
            console.log('PeerJS disconnected from signaling server. Attempting reconnect...');
            if (this.peer && !this.peer.destroyed) {
                this.peer.reconnect();
            }
        });

        return new Promise((resolve, reject) => {
            if (!this.peer) return reject(new Error('Peer not initialized'));

            this.peer.on('open', (assignedId: string) => {
                const finalId = assignedId || (this.peer as Peer).id;
                console.log('PeerJS opened with ID:', finalId);
                resolve(finalId);
            });

            this.peer.on('error', (err: any) => {
                console.error('PeerJS error:', err.type, err.message);

                const isNetworkError = err.type === 'network' ||
                    err.type === 'server-error' ||
                    err.type === 'socket-error' ||
                    err.type === 'socket-closed' ||
                    err.message?.includes('Lost connection');

                if (isNetworkError && retries > 0) {
                    console.log(`Connection dropped during init. Retrying in 1s...`);
                    setTimeout(async () => {
                        try {
                            // Pass the exact same roomId so we don't generate a new one on retry
                            const retryId = await this.init(roomId, retries - 1);
                            resolve(retryId);
                        } catch (retryErr) {
                            reject(retryErr);
                        }
                    }, 1000);
                } else {
                    reject(err);
                }
            });
        });
    }


    connect(peerId: string, metadata: any = {}) {
        if (!this.peer) throw new Error('Peer not initialized');
        const conn = this.peer.connect(peerId, { metadata });
        this._setupConnection(conn);
        return conn;
    }

    _setupConnection(conn: DataConnection) {
        conn.on('open', () => {
            this.connections[conn.peer] = conn;
            if (this.onConnectionCallback) this.onConnectionCallback(conn);
        });

        conn.on('data', (data: any) => {
            if (this.onMessageCallback) this.onMessageCallback(conn.peer, data);
        });

        conn.on('close', () => {
            delete this.connections[conn.peer];
            if (this.onDisconnectedCallback) this.onDisconnectedCallback(conn.peer);
        });

        conn.on('error', (err: any) => {
            console.error('Peer connection error:', err);
            delete this.connections[conn.peer];
        });
    }

    broadcast(data: any) {
        Object.values(this.connections).forEach(conn => {
            conn.send(data);
        });
    }

    send(peerId: string, data: any) {
        if (this.connections[peerId]) {
            this.connections[peerId].send(data);
        }
    }

    closeConnection(peerId: string) {
        if (this.connections[peerId]) {
            console.log(`Closing connection to peer: ${peerId}`);
            this.connections[peerId].close();
            delete this.connections[peerId];
        }
    }

    disconnect() {
        if (this.peer) {
            this.peer.destroy();
        }
    }
}

export default new PeerService();
