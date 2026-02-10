import ProductPageClient from './ProductPageClient'

export default function ProductPage({ params }: { params: { product: string } }) {
  return <ProductPageClient slug={params.product} />
}

