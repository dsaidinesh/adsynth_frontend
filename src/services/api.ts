import { toast } from "sonner";

// Add type declaration for ImportMeta
declare global {
  interface ImportMetaEnv {
    VITE_APP_API_URL: string;
  }
}

// Base API URL - using environment variable
const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

// Types
export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  product_name: string;
  product_description: string;
  target_audience: string;
  key_use_cases: string;
  campaign_goal: string;
  niche: string;
  created_at: string;
  updated_at: string;
}

export interface RedditReference {
  title: string;
  content: string;
  url: string;
}

export interface AdScript {
  id: string;
  campaign_id: string;
  provider: string;
  model: string;
  platform: string;
  content: string;
  reddit_references: RedditReference[];
  created_at: string;
}

// API client
export const api = {
  // Sets the auth token for all future requests
  setToken: (token: string) => {
    localStorage.setItem("auth_token", token);
  },

  // Gets the auth token
  getToken: (): string | null => {
    return localStorage.getItem("auth_token");
  },

  // Removes the auth token and performs cleanup
  removeToken: () => {
    localStorage.removeItem("auth_token");
  },

  // Refresh token functionality
  refreshToken: async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/token/refresh`, {
        method: "POST",
        headers: api.authHeaders(),
      });
      
      const data = await api.handleResponse(response);
      api.setToken(data.access_token);
      return data.access_token;
    } catch (error) {
      // If token refresh fails, log out the user
      api.auth.logout();
      window.location.href = "/login";
      return null;
    }
  },

  // Headers for authenticated requests
  authHeaders: (): Headers => {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    const token = api.getToken();
    if (token) {
      headers.append("Authorization", `Bearer ${token}`);
    }
    return headers;
  },

  // Handle response
  handleResponse: async (response: Response) => {
    // Skip token refresh for login endpoint
    const isLoginEndpoint = response.url.includes('/api/token');
    
    if (response.status === 401 && !isLoginEndpoint) {
      // Token expired, try to refresh
      const newToken = await api.refreshToken();
      if (!newToken) {
        throw new Error("Session expired. Please login again.");
      }
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: "An unknown error occurred",
      }));
      
      // Extract error message from various possible formats
      let errorMessage = "An error occurred";
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.detail) {
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (Array.isArray(error.detail)) {
          errorMessage = error.detail.map(item => item.toString()).join(', ');
        } else if (typeof error.detail === 'object') {
          // Handle nested error objects
          errorMessage = Object.values(error.detail)
            .map(value => value.toString())
            .join(', ');
        } else {
          errorMessage = String(error.detail);
        }
      } else if (error.message) {
        errorMessage = error.message.toString();
      }

      // For login endpoint, don't show toast as we'll handle it in the component
      if (!isLoginEndpoint) {
        toast.error(errorMessage);
      }
      
      // Create error object with the extracted message
      const customError = new Error(errorMessage);
      // Attach original error data for debugging
      (customError as any).originalError = error;
      throw customError;
    }
    
    return response.json();
  },

  // Auth endpoints
  auth: {
    register: async (username: string, email: string, password: string): Promise<User> => {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      return api.handleResponse(response);
    },
    
    login: async (username: string, password: string): Promise<AuthResponse> => {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch(`${API_BASE_URL}/api/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });
      
      const data = await api.handleResponse(response);
      api.setToken(data.access_token);
      return data;
    },
    
    logout: () => {
      api.removeToken();
    },
    
    isAuthenticated: (): boolean => {
      return !!api.getToken();
    },
  },

  // Campaign endpoints
  campaigns: {
    create: async (campaignData: Omit<Campaign, "id" | "user_id" | "created_at" | "updated_at">): Promise<Campaign> => {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/`, {
        method: "POST",
        headers: api.authHeaders(),
        body: JSON.stringify(campaignData),
      });
      
      return api.handleResponse(response);
    },
    
    get: async (id: string): Promise<Campaign> => {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
        headers: api.authHeaders(),
      });
      
      return api.handleResponse(response);
    },
    
    update: async (id: string, campaignData: Partial<Campaign>): Promise<Campaign> => {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
        method: "PUT",
        headers: api.authHeaders(),
        body: JSON.stringify(campaignData),
      });
      
      return api.handleResponse(response);
    },
    
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
        method: "DELETE",
        headers: api.authHeaders(),
      });
      
      return api.handleResponse(response);
    },
    
    list: async (): Promise<Campaign[]> => {
      const response = await fetch(`${API_BASE_URL}/api/campaigns/`, {
        headers: api.authHeaders(),
      });
      
      return api.handleResponse(response);
    },
  },

  // Ad script endpoints
  adScripts: {
    generate: async (
      campaign_id: string, 
      provider: string, 
      model: string,
      platform: string
    ): Promise<AdScript> => {
      const response = await fetch(`${API_BASE_URL}/api/ad-scripts/generate`, {
        method: "POST",
        headers: api.authHeaders(),
        body: JSON.stringify({ campaign_id, provider, model, platform }),
      });
      
      return api.handleResponse(response);
    },
    
    getByCampaign: async (campaign_id: string): Promise<AdScript[]> => {
      const response = await fetch(`${API_BASE_URL}/api/ad-scripts/campaign/${campaign_id}`, {
        headers: api.authHeaders(),
      });
      
      return api.handleResponse(response);
    },

    update: async (id: string, content: string): Promise<AdScript> => {
      const response = await fetch(`${API_BASE_URL}/api/ad-scripts/${id}`, {
        method: "PUT",
        headers: api.authHeaders(),
        body: JSON.stringify({ content }),
      });
      
      return api.handleResponse(response);
    },

    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/api/ad-scripts/${id}`, {
        method: "DELETE",
        headers: api.authHeaders(),
      });
      
      return api.handleResponse(response);
    },
  },

  // LLM providers - mock data for demonstration
  // In production, this would come from an endpoint
  llmProviders: {
    getProviders: (): { name: string; models: string[] }[] => {
      return [
        {
          name: "openai",
          models: ["gpt-4o", "gpt-3.5-turbo"],
        },
        {
          name: "claude",
          models: ["claude-instant", "claude-2"],
        },
        {
          name: "groq",
          models: ["llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b"],
        },
      ];
    },
  },
};