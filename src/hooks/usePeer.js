import { useState, useEffect, useCallback } from 'react';
import peerService from '../services/peerService';

export const usePeer = () => {
    const [peerId, setPeerId] = useState(null);
    const [connections, setConnections] = useState([]);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);

    const initialize = useCallback(async (customId) => {
        try {
            const id = await peerService.init(customId);
            setPeerId(id);

            peerService.onConnectionCallback = (conn) => {
                setConnections(prev => [...prev, conn.peer]);
            };

            peerService.onDisconnectedCallback = (disconnectedId) => {
                setConnections(prev => prev.filter(id => id !== disconnectedId));
            };

            peerService.onMessageCallback = (id, data) => {
                setLastMessage({ from: id, data });
            };

            return id;

        } catch (err) {
            setError(err.message);
        }
    }, []);

    const connectToPeer = useCallback((id, metadata, onConnected) => {
        const conn = peerService.connect(id, metadata);
        if (onConnected) {
            conn.on('open', onConnected);
        }
    }, []);

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
        initialize,
        connectToPeer,
        broadcast,
        sendDirect
    };
};
