export interface Product {
    id: string;
    brand: string;
    name: string;
    price: number;
    originalPrice?: number;
    discountRate?: number;
    imageUrl: string;
    isNew?: boolean;
    isBest?: boolean;
}

export const PRODUCTS: Product[] = [
    {
        id: "1",
        brand: "Matin Kim",
        name: "Logo Coating Jumpire",
        price: 189000,
        discountRate: 15,
        originalPrice: 222000,
        imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&auto=format&fit=crop&q=60",
        isBest: true,
    },
    {
        id: "2",
        brand: "Andersson Bell",
        name: "Unisex Western Jacket",
        price: 345000,
        imageUrl: "https://images.unsplash.com/photo-1551488852-080175bfa55c?w=800&auto=format&fit=crop&q=60",
        isNew: true,
    },
    {
        id: "3",
        brand: "Mardi Mercredi",
        name: "Flower Sweatshirt",
        price: 75000,
        imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=60",
    },
    {
        id: "4",
        brand: "Gentle Monster",
        name: "Lilit 01",
        price: 279000,
        imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=60",
    },
    {
        id: "5",
        brand: "Ader Error",
        name: "Twin Heart T-shirt",
        price: 129000,
        imageUrl: "https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800&auto=format&fit=crop&q=60",
        isBest: true,
    },
    {
        id: "6",
        brand: "Low Classic",
        name: "Pleats Skirt",
        price: 158000,
        imageUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop&q=60",
    },
];

export const TRENDS = [
    {
        id: "t1",
        title: "Modest Layers",
        description: "Elegant coverage for the modern city.",
        imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: "t2",
        title: "K-Pop Street",
        description: "Bold colors and oversized fits.",
        imageUrl: "https://images.unsplash.com/photo-1529139574466-a302d27f6054?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: "t3",
        title: "Clean Minimal",
        description: "Essential pieces for everyday luxury.",
        imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=60"
    }
]
