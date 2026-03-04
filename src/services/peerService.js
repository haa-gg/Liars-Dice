import { Peer } from 'peerjs';

// Generate a short, readable room code
const generateRoomCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

class PeerService {
  constructor() {
    this.peer = null;
    this.connections = {};
    this.onMessageCallback = null;
    this.onConnectionCallback = null;
    this.onDisconnectedCallback = null;
  }

  init(id = null) {
    if (this.peer) {
      console.log('Destroying existing peer instance...');
      this.peer.destroy();
    }
    
    // Generate a short room code if no ID provided
    const roomId = id || generateRoomCode(6); // Change 6 to desired length
    
    console.log('Initializing PeerJS with ID:', roomId);
    this.peer = new Peer(roomId, { debug: 1 });

    this.peer.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer);
      this._setupConnection(conn);
    });

    return new Promise((resolve, reject) => {
      this.peer.on('open', (assignedId) => {
        const finalId = assignedId || this.peer.id;
        console.log('PeerJS opened with ID:', finalId);
        resolve(finalId);
      });
      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        reject(err);
      });
    });
  }


  connect(peerId, metadata = {}) {
    const conn = this.peer.connect(peerId, { metadata });
    this._setupConnection(conn);
    return conn;
  }

  _setupConnection(conn) {
    conn.on('open', () => {
      this.connections[conn.peer] = conn;
      if (this.onConnectionCallback) this.onConnectionCallback(conn);
    });

    conn.on('data', (data) => {
      if (this.onMessageCallback) this.onMessageCallback(conn.peer, data);
    });

    conn.on('close', () => {
      delete this.connections[conn.peer];
      if (this.onDisconnectedCallback) this.onDisconnectedCallback(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('Peer connection error:', err);
      delete this.connections[conn.peer];
    });
  }

  broadcast(data) {
    Object.values(this.connections).forEach(conn => {
      conn.send(data);
    });
  }

  send(peerId, data) {
    if (this.connections[peerId]) {
      this.connections[peerId].send(data);
    }
  }

  disconnect() {
    if (this.peer) {
      this.peer.destroy();
    }
  }
}

export default new PeerService();
