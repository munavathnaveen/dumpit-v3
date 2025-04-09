import apiClient from './apiClient'

export interface RecentOrder {
  id: string
  customerName: string
  date: string
  total: number
  status: string
}

export interface Analytics {
  totalRevenue: number
  totalOrders: number
  totalProducts: number
  pendingOrders: number
  revenue: {
    daily: {date: string; amount: number}[]
    weekly: {week: string; amount: number}[]
    monthly: {month: string; amount: number}[]
  }
  ordersByStatus: {
    status: string
    count: number
  }[]
  topProducts: {
    id: string
    name: string
    sales: number
    revenue: number
  }[]
  recentOrders: RecentOrder[]
}

export const fetchAnalytics = async (): Promise<Analytics> => {
  try {
    const response = await apiClient.get('/analytics/vendor-dashboard')
    return response.data.data
  } catch (error) {
    console.error('Error fetching analytics:', error)
    throw error
  }
}

export const exportData = async (
  dataType: 'products' | 'orders' | 'revenue',
  format: 'csv' | 'excel' = 'csv'
): Promise<Blob> => {
  try {
    // Use appropriate query parameters based on data type
    let url = `/analytics/export/${dataType}?format=${format}`;
    
    // Add additional parameters for revenue export if needed
    if (dataType === 'revenue') {
      // Default to monthly period if not specified
      url += `&period=monthly`;
    }
    
    const response = await apiClient.get(url, {
      responseType: 'blob',
    });
    
    if (!response.data) {
      throw new Error(`No data returned from ${dataType} export`);
    }
    
    return response.data;
  } catch (error: any) {
    console.error(`Error exporting ${dataType} data:`, error);
    // Add more specific error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 404) {
        throw new Error(`Export endpoint for ${dataType} not found. Please check the API configuration.`);
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to export this data.');
      } else if (error.response.status === 400) {
        throw new Error(`Invalid export request for ${dataType}. Please check your parameters.`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Please check your network connection.');
    }
    throw error;
  }
}

export interface ImportResult {
  success: boolean;
  processed: number;
  created?: number;
  updated?: number;
  errors?: string[];
  format?: {
    sample: string;
    fields: string[];
  };
}

export const importData = async (dataType: 'products', file: File): Promise<ImportResult> => {
  try {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('shop', 'current'); // The backend will determine the current vendor's shop

    const response = await apiClient.post(`/analytics/import/${dataType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data || !response.data.data) {
      throw new Error(`No data returned from ${dataType} import`);
    }

    return response.data.data;
  } catch (error: any) {
    console.error(`Error importing ${dataType} data:`, error);
    
    // Extract error information for better handling
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 404) {
        throw new Error(`Import endpoint for ${dataType} not found. Please check the API configuration.`);
      } else if (error.response.status === 403) {
        throw new Error('You do not have permission to import this data.');
      } else if (error.response.status === 400) {
        // For format errors, we'll try to get the correct format from the server
        if (error.response.data && error.response.data.data && error.response.data.data.format) {
          const errorResult: ImportResult = {
            success: false,
            processed: 0,
            errors: [error.response.data.message || 'Invalid import format'],
            format: error.response.data.data.format
          };
          throw errorResult;
        }
        throw new Error(error.response.data?.message || `Invalid import request for ${dataType}. Please check your file format.`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response received from server. Please check your network connection.');
    }
    throw error;
  }
};
