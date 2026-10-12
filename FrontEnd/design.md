# Design Document

## 1. Goal Desain
Mendesain halaman detail produk yang kuat secara conversion, rapi secara visual, dan jelas dalam menyampaikan value proposition produk.

## 2. Design Principles
- Clarity first: user langsung memahami produk dan benefitnya
- Trust building: garansi, free returns, shipping details, made in USA
- Conversion oriented: CTA utama terlihat jelas dan mudah dijangkau
- Brand storytelling: sustainability dan outdoor identity terlihat dalam desain

## 3. Layout Structure
### A. Top Promo Bar
- Promo bar: "Buy 2, Get 2 Free: warmest sock · Ends 10/18"
- Secondary promo: "All $30+ Orders Ship Free"

### B. Header & Navigation
- Logo United By Blue
- Navigation category: New Arrivals, Bags, Socks, Accessories, Household, Apparel, Mission, Sale
- Cart icon

### C. Product Hero
Left side:
- Image gallery vertical thumbnail + main image
- clickable thumbnails
- modal/zoom for larger preview

Right side:
- product title
- product badge/status: Imperfect Packaging
- price block
- promotion text
- color swatches
- size selector
- quantity selector
- CTA: Add to cart
- payment/shipping chips
- trust microcopy: free shipping, returns, lifetime guarantee

### D. Description and Details Section
- Description text with strong brand story
- Why you’ll love them bullet list
- Sizing section
- Materials section
- Guarantee and sustainability note

### E. Recommendation Section
- “You may also like” card carousel with 3 product tiles
- Each card includes thumbnail, name, price, add-to-wishlist, CTA

## 4. UX Flow
1. User masuk ke product page
2. User melihat hero image dan benefit summary
3. User memilih color + size
4. User melihat total harga dan promo bundle
5. User menekan Add to Cart
6. User melihat updated cart count dan checkout entry point

## 5. Component Breakdown
### ProductGallery
- `thumbnailList[]`
- `selectedImage`
- interactions: click thumbnail, previous/next if carousel

### VariantSelector
- `colorOptions[]`
- `sizeOptions[]`
- `selectedColor`
- `selectedSize`
- `disabled` state for unavailable variants

### BuyBox
- product name
- price
- promo badges
- CTA button
- quantity control

### TrustBar
- free shipping
- 90-day returns
- lifetime replacement
- 1 lb trash removed

### ProductDetails
- description paragraphs
- bullet highlights
- material breakdown
- sizing table

### RelatedProducts
- card list with image, name, price, CTA

## 6. Data Model
```json
{
  "product": {
    "id": "bison-boot-sock",
    "name": "Ultimate Bison Boot Sock - Imperfect Packaging",
    "category": "Socks",
    "price": 44,
    "currency": "USD",
    "status": "active",
    "colors": ["Coffee", "Wild Green"],
    "sizes": ["S/M", "M/L"],
    "materials": [
      { "name": "Wool", "percentage": 62 },
      { "name": "Nylon", "percentage": 22 },
      { "name": "Bison Wool", "percentage": 15 },
      { "name": "Spandex", "percentage": 1 }
    ],
    "promotions": [
      "Mix any 3 socks, save 15%",
      "Free shipping over $30"
    ],
    "guarantees": [
      "90-day free returns",
      "Lifetime replacement"
    ]
  }
}
```

## 7. Visual Design Direction
- Warna utama: earth tones, krem, olive, forest green, cognac brown
- Tipografi: clean, premium, modern, cocok untuk outdoor brand
- UI style: minimal, editorial, sangat product-centered
- CTA button: high contrast, prominent, sesuai brand premium but functional

## 8. Responsive Strategy
- Mobile: gallery stack + buy box di bawah gambar
- Tablet: dua kolom hero, detail section lebih long-form
- Desktop: sticky buy box di sisi kanan

## 9. Accessibility & Inclusion
- Text contrast yang jelas pada white/earth-tone background
- Touch target min 44x44 px
- Label jelas untuk color dan size
- Image alt text dan focus ring untuk navigasi keyboard

## 10. Success Criteria Design
- User dapat memahami produk dalam < 10 detik
- User tahu pilihan warna/ukuran sebelum scroll panjang
- CTA Add to cart visible tanpa menggulir terlalu jauh
- Trust signals terlihat di atas fold utama
