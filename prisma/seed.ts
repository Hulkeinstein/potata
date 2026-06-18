import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// seed 전용 상품 데이터 (data/dummy.ts PRODUCTS에서 인라인 복사)
const PRODUCTS = [
  {
    id: "1",
    name: "Kalix T Jacket Black - 26SS",
    brand: "The North Face White Label",
    price: 719,
    originalPrice: 779,
    discountRate: 8,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNjAxMjJfMTY5/MDAxNzY5MDU5OTg1NDYw.5pHBpFjHOVcZNCXV6ztANvhSF8iN1YR-NKgntgy4soYg.Rfk67XmSl-1tcOF4wT-hPNyxyl7dr3mmgltZqs4zSBwg.PNG/a_fe5a41998e644efb82dd74b30e400d85.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNjAxMjJfMTY5/MDAxNzY5MDU5OTg1NDYw.5pHBpFjHOVcZNCXV6ztANvhSF8iN1YR-NKgntgy4soYg.Rfk67XmSl-1tcOF4wT-hPNyxyl7dr3mmgltZqs4zSBwg.PNG/a_fe5a41998e644efb82dd74b30e400d85.png"
    ],
    category: "Outer",
    isNew: true,
    isBest: false,
    isHot: false,
    rating: 4.8,
    reviewCount: 42,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    description: "The North Face White Label Kalix T Jacket offers superior protection against the elements while maintaining a sleek, urban aesthetic. Featuring durable water-resistant fabric and a streamlined fit, this jacket is perfect for both outdoor adventures and city living.",
  },
  {
    id: "2",
    name: "Therma-Fit ADV Lunar Lake Loose Hooded Jacket",
    brand: "Nike ACG",
    price: 685,
    originalPrice: undefined,
    discountRate: undefined,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNTA3MzFfMSAg/MDAxNzUzOTE2MTYxOTM5.XdiPYVzO-7w5UY4JAG8Wbk6FNhhHJ4PoiNZF5ie9MZkg.dBg9TnRTAvqvktPmcMUASIMfQ2_1gD6VVO7dNYgy46Ig.PNG/a_7b3a332e386c47fc99e5c23000b6b9d5.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNTA3MzFfMSAg/MDAxNzUzOTE2MTYxOTM5.XdiPYVzO-7w5UY4JAG8Wbk6FNhhHJ4PoiNZF5ie9MZkg.dBg9TnRTAvqvktPmcMUASIMfQ2_1gD6VVO7dNYgy46Ig.PNG/a_7b3a332e386c47fc99e5c23000b6b9d5.png"
    ],
    category: "Outer",
    isNew: false,
    isBest: false,
    isHot: false,
    rating: 4.9,
    reviewCount: 128,
    sizes: ["90", "95", "100", "105", "110"],
    colors: ["Black", "Summit White"],
    description: "Engineered for extreme conditions, the Nike ACG Therma-Fit ADV Lunar Lake Jacket provides exceptional warmth without the bulk. Its advanced insulation technology mimics the warmth-retaining properties of waterfowl down, ensuring you stay comfortable in the coldest environments.",
  },
  {
    id: "3",
    name: "Fur Hoodie Zip Up Gray",
    brand: "AMOU",
    price: 179,
    originalPrice: 239,
    discountRate: 25,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNTExMTBfMTk0/MDAxNzYyNzYwODc0MzEz.iFWrfwVG1fiC7oa9WhKHB9-KobMFwrTBmM1BTYGeWfwg.w6R3zRlzoE8ihaqDILRqi2_dWngeFU1TJfixtdd93jYg.PNG/p_b5c283c605da422184870ee1f5c23863.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNTExMTBfMTk0/MDAxNzYyNzYwODc0MzEz.iFWrfwVG1fiC7oa9WhKHB9-KobMFwrTBmM1BTYGeWfwg.w6R3zRlzoE8ihaqDILRqi2_dWngeFU1TJfixtdd93jYg.PNG/p_b5c283c605da422184870ee1f5c23863.png"
    ],
    category: "Top",
    isNew: false,
    isBest: true,
    isHot: false,
    rating: 4.7,
    reviewCount: 215,
    sizes: ["Free"],
    colors: ["Gray"],
    description: "Experience the ultimate in cozy luxury with the AMOU Fur Hoodie. Crafted from premium faux fur, this zip-up hoodie features a relaxed fit and a soft, plush texture that feels like a warm embrace. Perfect for layering during chilly evenings.",
  },
  {
    id: "4",
    name: "25 Hoodie Light Gray Navy",
    brand: "IAB Studio",
    price: 369,
    originalPrice: undefined,
    discountRate: undefined,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNTEyMDJfMjg4/MDAxNzY0NjY3OTM2MTI0.r5Wf0TyvugM2bFkVW1nge1K6Q6sTl3nuepU7wl7OLjwg.FzJclmGcfDI6BzGZawkWs5n0acKv6J1IxF-oLJkrZGsg.PNG/a_78fbf8993b6947688f27169e17b43213.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNTEyMDJfMjg4/MDAxNzY0NjY3OTM2MTI0.r5Wf0TyvugM2bFkVW1nge1K6Q6sTl3nuepU7wl7OLjwg.FzJclmGcfDI6BzGZawkWs5n0acKv6J1IxF-oLJkrZGsg.PNG/a_78fbf8993b6947688f27169e17b43213.png"
    ],
    category: "Top",
    isNew: false,
    isBest: false,
    isHot: true,
    rating: 5.0,
    reviewCount: 890,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Light Gray Navy"],
    description: "A staple of modern streetwear, the IAB Studio 25 Hoodie combines iconic branding with everyday comfort. The high-quality cotton blend fabric ensures durability, while the distinctive colorway adds a touch of bold style to your casual wardrobe.",
  },
  {
    id: "5",
    name: "Molly One Tuck Sweat Pants Gray",
    brand: "AMOU",
    price: 95,
    originalPrice: undefined,
    discountRate: undefined,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNTExMTBfNjYg/MDAxNzYyNzYwNTM3MjM0.Kv01uq8FPrWbV2qIQqXgUbMMAZNqbbBkvGjBqlohqQ0g.ULW7Y3KTXCsXqsmP_w-kZWhzmER2VtkQcQlUVPqzah0g.PNG/p_dd7808d62b75495f8c082a06c74f919e.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNTExMTBfNjYg/MDAxNzYyNzYwNTM3MjM0.Kv01uq8FPrWbV2qIQqXgUbMMAZNqbbBkvGjBqlohqQ0g.ULW7Y3KTXCsXqsmP_w-kZWhzmER2VtkQcQlUVPqzah0g.PNG/p_dd7808d62b75495f8c082a06c74f919e.png"
    ],
    category: "Bottom",
    isNew: false,
    isBest: false,
    isHot: false,
    rating: 4.6,
    reviewCount: 56,
    sizes: ["Free"],
    colors: ["Gray"],
    description: "Effortlessly cool and comfortable, the AMOU Molly One Tuck Sweat Pants feature a unique tucked design that adds a tailored touch to classic loungewear. Made from soft, breathable cotton, these pants are versatile enough for home relaxation or casual outings.",
  },
  {
    id: "6",
    name: "Dri-Fit Challenger Woven Pants Black",
    brand: "Nike",
    price: 99,
    originalPrice: undefined,
    discountRate: undefined,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNTA3MzBfMTAg/MDAxNzUzODYyMzM5MDIz.ztAnS8xeeJUAEKLVBdDRV-iGGz9zVVCysb95u7YjjlIg.gkoEk35axHEHtSTKEnUwxzyYobsRMVx0qjl1WglZObIg.PNG/a_c047a1824ced4dd587252913e2cf5b8d.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNTA3MzBfMTAg/MDAxNzUzODYyMzM5MDIz.ztAnS8xeeJUAEKLVBdDRV-iGGz9zVVCysb95u7YjjlIg.gkoEk35axHEHtSTKEnUwxzyYobsRMVx0qjl1WglZObIg.PNG/a_c047a1824ced4dd587252913e2cf5b8d.png"
    ],
    category: "Bottom",
    isNew: true,
    isBest: false,
    isHot: false,
    rating: 4.5,
    reviewCount: 23,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black"],
    description: "Train smarter with the Nike Dri-Fit Challenger Woven Pants. Designed with sweat-wicking technology, these lightweight pants keep you dry and focused. The tapered fit and articulated knees provide freedom of movement for any activity.",
  },
  {
    id: "7",
    name: "LTP-V007L-7B1",
    brand: "Casio",
    price: 69,
    originalPrice: undefined,
    discountRate: undefined,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNTA3MzFfODUg/MDAxNzUzODk0NjU2NzIz.MaBCG9a4YXqzGEjoegBVj2KeKVmz2IoZMmfAAtwc5FIg.C_dJznH0jv6FkFhL2YC3ckEjuhUC8kev6hTmudJ0k0Qg.PNG/a_d26969425975469384d8d1b5f8731aeb.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNTA3MzFfODUg/MDAxNzUzODk0NjU2NzIz.MaBCG9a4YXqzGEjoegBVj2KeKVmz2IoZMmfAAtwc5FIg.C_dJznH0jv6FkFhL2YC3ckEjuhUC8kev6hTmudJ0k0Qg.PNG/a_d26969425975469384d8d1b5f8731aeb.png"
    ],
    category: "Acc",
    isNew: false,
    isBest: false,
    isHot: false,
    rating: 4.9,
    reviewCount: 312,
    sizes: ["One Size"],
    colors: ["Silver"],
    description: "Timeless elegance meets modern functionality in the Casio LTP-V007L-7B1. This rectangular analog watch features a sleek silver dial and a premium leather band, making it the perfect accessory for both formal and casual ensembles.",
  },
  {
    id: "8",
    name: "Air Force 1 '07 Low White",
    brand: "Nike",
    price: 279,
    originalPrice: undefined,
    discountRate: undefined,
    imageUrl: "https://kream-phinf.pstatic.net/MjAyNDA2MjJfMTMx/MDAxNzE5MDI5ODMzOTg2.8TsdHQrXy3-tcIMHceZOG5eBSdl_-ybtjFhLVIZDOXEg.TUQIZNOi5ptP4zsfcdsi3EBAgTwh2jruSeKGnbMekaQg.PNG/a_56586590956f4404862cbdaeff6a5e63.png",
    images: [
      "https://kream-phinf.pstatic.net/MjAyNDA2MjJfMTMx/MDAxNzE5MDI5ODMzOTg2.8TsdHQrXy3-tcIMHceZOG5eBSdl_-ybtjFhLVIZDOXEg.TUQIZNOi5ptP4zsfcdsi3EBAgTwh2jruSeKGnbMekaQg.PNG/a_56586590956f4404862cbdaeff6a5e63.png"
    ],
    category: "Shoes",
    isNew: false,
    isBest: true,
    isHot: false,
    rating: 4.9,
    reviewCount: 5042,
    sizes: ["230", "240", "250", "260", "270", "280"],
    colors: ["White"],
    description: "The legend lives on in the Nike Air Force 1 '07. detailed with the clean, crisp finishes and nothing-but-net style. The stitched leather overlays on the upper add heritage style, durability and support.",
  },
];

async function main() {
  console.log(`시드 시작: 상품 ${PRODUCTS.length}개 upsert...`);

  for (const product of PRODUCTS) {
    const data = {
      name: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice ?? null,
      discountRate: product.discountRate ?? null,
      imageUrl: product.imageUrl,
      images: product.images ?? [],
      category: product.category ?? "",
      description: product.description ?? null,
      sizes: product.sizes ?? [],
      colors: product.colors ?? [],
      rating: product.rating ?? null,
      reviewCount: product.reviewCount ?? null,
      isNew: product.isNew ?? false,
      isBest: product.isBest ?? false,
      isHot: product.isHot ?? false,
    };

    await prisma.product.upsert({
      where: { id: product.id },
      create: { id: product.id, ...data },
      update: data,
    });
  }

  const count = await prisma.product.count();
  console.log(`시드 완료: 총 ${count}개 상품`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
