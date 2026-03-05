import { useState, useCallback } from 'react';
import peerService from '../services/peerService';

export const usePeer = () => {
    const [peerId, setPeerId] = useState(null);
    const [connections, setConnections] = useState([]);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const [isReconnecting, setIsReconnecting] = useState(false);

    const initialize = useCallback(async (customId) => {
        try {
            const id = await peerService.init(customId);
            setPeerId(id);
            localStorage.setItem('liarsDicePeerId', id);

            peerService.onConnectionCallback = (conn) => {
                // Use a Set to prevent duplicate connections being recorded
                setConnections(prev => Array.from(new Set([...prev, conn.peer])));
            };

            peerService.onDisconnectedCallback = (disconnectedId) => {
                setConnections(prev => prev.filter(id => id !== disconnectedId));
            };

            peerService.onMessageCallback = (id, data) => {
                setLastMessage({ from: id, data });
            };

            peerService.onReconnectCallback = () => {
                setIsReconnecting(false);
            };

            return id;

        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const connectToPeer = useCallback((id, metadata, onConnected) => {
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
        } catch (err) {
            setIsReconnecting(false);
            setError("Failed to reconnect: " + err.message);
            return null;
        }
    }, [initialize]);

    const broadcast = useCallback((data) => {
        peerService.broadcast(data);
    }, []);

    const sendDirect = useCallback((id, data) => {
        peerService.send(id, data);
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
        sendDirect
    };
};
