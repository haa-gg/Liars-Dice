import { useState, useCallback } from 'react';
import peerService from '../services/peerService';
import { DataConnection } from 'peerjs';

export interface UsePeerReturn {
    peerId: string | null;
    connections: string[];
    lastMessage: { from: string; data: any } | null;
    error: string | null;
    isReconnecting: boolean;
    initialize: (customId?: string) => Promise<string>;
    connectToPeer: (id: string, metadata: any, onConnected?: () => void) => DataConnection;
    reconnect: () => Promise<string | null>;
    broadcast: (data: any) => void;
    sendDirect: (id: string, data: any) => void;
    closeConnection: (id: string) => void;
}

export const usePeer = (): UsePeerReturn => {
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connections, setConnections] = useState<string[]>([]);
    const [lastMessage, setLastMessage] = useState<{ from: string; data: any } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

    const initialize = useCallback(async (customId?: string) => {
        try {
            const id = await peerService.init(customId);
            setPeerId(id);
            localStorage.setItem('liarsDicePeerId', id);

            peerService.onConnectionCallback = (conn: DataConnection) => {
                // Use a Set to prevent duplicate connections being recorded
                setConnections(prev => Array.from(new Set([...prev, conn.peer])));
            };

            peerService.onDisconnectedCallback = (disconnectedId: string) => {
                setConnections(prev => prev.filter(id => id !== disconnectedId));
            };

            peerService.onMessageCallback = (id: string, data: any) => {
                setLastMessage({ from: id, data });
            };

            peerService.onReconnectCallback = () => {
                setIsReconnecting(false);
            };

            return id;

        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, []);

    const connectToPeer = useCallback((id: string, metadata: any, onConnected?: () => void) => {
        const conn = peerService.connect(id, metadata);
        if (onConnected) {
            conn.on('open', onConnected);
        }
        return conn;
    }, []);

    const reconnect = useCallback(async () => {
        const savedId = localStorage.getItem('liarsDicePeerId');
        if (!savedId) {
            setError("No previous session found.");
            return null;
        }

        setIsReconnecting(true);
        try {
            // Re-initialize with the saved ID
            const id = await initialize(savedId);
            setIsReconnecting(false);
            return id;
        } catch (err: any) {
            setIsReconnecting(false);
            setError("Failed to reconnect: " + err.message);
            throw err;
        }
    }, [initialize]);

    const broadcast = useCallback((data: any) => {
        peerService.broadcast(data);
    }, []);

    const sendDirect = useCallback((id: string, data: any) => {
        peerService.send(id, data);
    }, []);

    const closeConnection = useCallback((id: string) => {
        peerService.closeConnection(id);
        setConnections(prev => prev.filter(connId => connId !== id));
    }, []);

    return {
        peerId,
        connections,
        lastMessage,
        error,
        isReconnecting,
        initialize,
        connectToPeer,
        reconnect,
        broadcast,
        sendDirect,
        closeConnection
    };
};
