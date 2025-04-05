import apiClient from './apiClient';

export interface RecentOrder {
  id: string;
  customerName: string;
  date: string;
  total: number;
  status: string;
}

export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  pendingOrders: number;
  revenue: {
    daily: { date: string; amount: number }[];
    weekly: { week: string; amount: number }[];
    monthly: { month: string; amount: number }[];
  };
  ordersByStatus: {
    status: string;
    count: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  recentOrders: RecentOrder[];
}

export const fetchAnalytics = async (): Promise<Analytics> => {
  try {
    const response = await apiClient.get('/api/v1/analytics/vendor-dashboard');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

export const exportData = async (dataType: 'products' | 'orders' | 'revenue', format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
  try {
    const response = await apiClient.get(`/api/v1/analytics/export/${dataType}?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error(`Error exporting ${dataType} data:`, error);
    throw error;
  }
};

export const importData = async (dataType: 'products', file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post(`/api/v1/analytics/import/${dataType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error importing ${dataType} data:`, error);
    throw error;
  }
}; 