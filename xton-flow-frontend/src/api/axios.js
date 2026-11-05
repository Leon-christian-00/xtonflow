import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Request interceptor — no manual token needed, cookie is sent automatically
api.interceptors.request.use((config) => config, (error) => Promise.reject(error));

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Specialized functions for communication features
export const communicationApi = {
  // Send a request from one team to another (e.g., bartender to kitchen)
  sendRequest: (message, recipientIds, sourceBoardId, targetBoardId, relatedTaskId) => {
    return api.post('/communications/request', null, {
      params: {
        message,
        recipientIds,
        sourceBoardId,
        targetBoardId,
        relatedTaskId
      }
    });
  },

  // Send a completion notification
  sendCompletion: (message, recipientIds, boardId, taskId) => {
    return api.post('/communications/completion', null, {
      params: {
        message,
        recipientIds,
        boardId,
        taskId
      }
    });
  },

  // Send a project update
  sendUpdate: (message, boardIds, recipientIds) => {
    return api.post('/communications/update', null, {
      params: {
        message,
        boardIds,
        recipientIds
      }
    });
  },

  // Notify when a dependency is ready
  notifyDependencyReady: (message, dependentTeamMemberIds, sourceBoardId, dependentBoardId, relatedTaskId) => {
    return api.post('/communications/dependency-ready', null, {
      params: {
        message,
        dependentTeamMemberIds,
        sourceBoardId,
        dependentBoardId,
        relatedTaskId
      }
    });
  }
};