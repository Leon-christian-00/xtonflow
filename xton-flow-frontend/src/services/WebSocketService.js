import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.boardSubscriptions = new Map();
    this.notificationSubscription = null;
    this.connectionPromise = null;
  }

  ensureConnected() {
    if (this.stompClient && this.stompClient.connected) {
      return Promise.resolve(this.stompClient);
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const socket = new SockJS('/ws');
      this.stompClient = Stomp.over(socket);

      this.stompClient.connect({}, (frame) => {
        this.connectionPromise = null;
        console.log('Connected to WebSocket:', frame);
        resolve(this.stompClient);
      }, (error) => {
        this.connectionPromise = null;
        this.stompClient = null;
        reject(error);
      });
    });

    return this.connectionPromise;
  }

  connect(boardId, onTaskUpdate) {
    this.ensureConnected()
      .then(() => {
        if (this.boardSubscriptions.has(boardId)) {
          return;
        }

        const boardSubscription = this.stompClient.subscribe(
          `/topic/board/${boardId}/tasks`,
          (message) => {
            const event = JSON.parse(message.body);
            onTaskUpdate(event);
          }
        );

        this.boardSubscriptions.set(boardId, boardSubscription);
      })
      .catch((error) => {
        console.error('Failed to connect board WebSocket:', error);
      });
  }

  // Connect to user-specific notifications
  connectNotifications(onNotification) {
    this.ensureConnected()
      .then(() => {
        if (this.notificationSubscription) {
          return;
        }

        this.notificationSubscription = this.stompClient.subscribe(
          '/user/queue/notifications',
          (message) => {
            const notification = JSON.parse(message.body);
            onNotification(notification);
          }
        );
      })
      .catch((error) => {
        console.error('Failed to connect notification WebSocket:', error);
      });
  }

  disconnect(boardId) {
    if (this.boardSubscriptions.has(boardId)) {
      this.boardSubscriptions.get(boardId).unsubscribe();
      this.boardSubscriptions.delete(boardId);
    }
    
    if (this.stompClient && this.boardSubscriptions.size === 0 && !this.notificationSubscription) {
      if (this.stompClient.connected) {
        this.stompClient.disconnect();
        console.log('Disconnected from WebSocket');
      }

      this.stompClient = null;
      this.connectionPromise = null;
    }
  }

  disconnectNotifications() {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
      this.notificationSubscription = null;
    }
    
    if (this.stompClient && this.boardSubscriptions.size === 0) {
      if (this.stompClient.connected) {
        this.stompClient.disconnect();
        console.log('Disconnected from WebSocket');
      }

      this.stompClient = null;
      this.connectionPromise = null;
    }
  }

  // Method to send a notification (if needed)
  sendNotification(destination, message) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.send(destination, {}, JSON.stringify(message));
    }
  }
}

export default new WebSocketService();