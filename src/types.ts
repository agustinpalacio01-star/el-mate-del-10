export type ProductImage = {
  id: number
  product_id: number
  image_url: string
  position: number
  is_cover: boolean
}

export type ProductFeature = {
  id: number
  product_id: number
  feature_name: string
  feature_value: string
  position: number
}

export type Product = {
  id: number
  created_at: string
  name: string | null
  category: string | null
  model: string | null
  price: number | null
  description: string | null
  stock: number | null
  is_new: boolean | null
  is_featured: boolean | null
  is_published: boolean | null
  product_images?: ProductImage[]
  product_features?: ProductFeature[]
}

export type CartItem = {
  product: Product
  quantity: number
}
