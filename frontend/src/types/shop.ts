export interface Shop {
    _id: string;
    name: string;
    description: string;
    image: string;
    logo?: string;
    address: {
        street: string;
        village: string;
        district: string;
        state: string;
        pincode: string;
        phone: string;
    };
    location: {
        type: string;
        coordinates: number[];
    };
    owner?: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    rating: number;
    numReviews?: number;
    isOpen: boolean;
    isActive: boolean;
    isVerified: boolean;
    categories: string[];
    minimumOrderAmount: number;
    shippingFee: number;
    freeShippingThreshold: number;
    taxRate: number;
    reviews: Array<{
        user: {
            _id: string;
            name: string;
            avatar_url?: string;
        };
        rating: number;
        text: string;
        createdAt: string;
    }>;
    openingHours?: Array<{
        day: string;
        hours: string;
        isOpen: boolean;
    }>;
    distance?: number | string;
    createdAt: string;
    updatedAt: string;
}

export interface ShopFilters {
    category?: string;
    rating?: number;
    isOpen?: boolean;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
    latitude?: number;
    longitude?: number;
    distance?: number;
} 