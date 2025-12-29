import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { Metadata } from 'next'
import { ProductCookieSetter } from './ProductCookieSetter'
import { readFile } from 'fs/promises'
import { join } from 'path'

type PageProps = {
  params: { product: string; page: string }
}

async function getLandingPage(productSlug: string, pageSlug: string) {
  // First get the product
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, price_cents, stripe_price_id')
    .eq('slug', productSlug)
    .eq('is_active', true)
    .single()

  if (productError || !product) {
    return null
  }

  const productData = product as { id: string; name: string; slug: string; price_cents: number; stripe_price_id: string | null }

  // Then get the landing page
  const { data: page, error: pageError } = await supabaseAdmin
    .from('landing_pages')
    .select('*')
    .eq('product_id', productData.id)
    .eq('slug', pageSlug)
    .eq('is_active', true)
    .single()

  // If page not found in database, but pageSlug is "main", try to use default file
  if ((pageError || !page) && pageSlug === 'main') {
    // Create a virtual page object for "main" fallback
    const virtualPage = {
      id: '',
      product_id: productData.id,
      name: productData.name,
      slug: 'main',
      page_type: 'html' as const,
      content: '', // Will be read from file
      meta_title: productData.name,
      meta_description: `Learn more about ${productData.name}`,
      variant_name: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return { product: productData, page: virtualPage }
  }

  if (pageError || !page) {
    return null
  }

  const pageData = page as { 
    id: string
    product_id: string
    name: string
    slug: string
    page_type: 'html' | 'react'
    content: string
    meta_title: string | null
    meta_description: string | null
    variant_name: string | null
    is_active: boolean
    created_at: string
    updated_at: string
  }

  return { product: productData, page: pageData }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getLandingPage(params.product, params.page)

  if (!data) {
    return { title: 'Page Not Found' }
  }

  return {
    title: data.page.meta_title || data.product.name,
    description: data.page.meta_description || `Learn more about ${data.product.name}`,
  }
}

export default async function LandingPage({ params }: PageProps) {
  const data = await getLandingPage(params.product, params.page)

  if (!data) {
    notFound()
  }

  const { product, page } = data

  // Get affiliate tracking info from cookies
  const cookieStore = cookies()
  const affCode = cookieStore.get('aff')?.value || ''
  const visitorId = cookieStore.get('vid')?.value || ''

  // Format price for display
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price_cents / 100)

  // Check if content is a file path or actual HTML content
  let content = page.content || ''
  
  // If content is empty or looks like a file path, try to read from file
  if (!content || content.trim() === '' || content.startsWith('/') || content.startsWith('./')) {
    let filePath: string = ''
    try {
      // Determine file path
      if (content && (content.startsWith('/') || content.startsWith('./'))) {
        // Use the path from database
        filePath = content.startsWith('/') ? content.slice(1) : content.replace('./', '')
      } else {
        // Default to landing page file based on product slug
        // Try product slug first, then product-page combination
        filePath = `landing/${product.slug}.html`
      }
      
      const fullPath = join(process.cwd(), 'public', filePath)
      console.log('Reading landing page file from:', fullPath)
      content = await readFile(fullPath, 'utf-8')
      console.log('Successfully read file, length:', content.length)
      
      // If the content is a full HTML document, extract body and head content
      // This handles cases where the file has <html>, <head>, <body> tags
      let extractedStyles = ''
      let extractedScripts = ''
      
      if (content.includes('<head')) {
        const headMatch = content.match(/<head[^>]*>([\s\S]*)<\/head>/i)
        if (headMatch && headMatch[1]) {
          const headContent = headMatch[1]
          // Extract styles from head
          const styleMatches = headContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
          if (styleMatches) {
            extractedStyles = styleMatches.join('\n')
          }
          // Extract scripts from head (but we'll add them separately)
          const scriptMatches = headContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi)
          if (scriptMatches) {
            extractedScripts = scriptMatches.join('\n')
          }
        }
      }
      
      if (content.includes('<body')) {
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        if (bodyMatch && bodyMatch[1]) {
          content = bodyMatch[1]
          console.log('Extracted body content, new length:', content.length)
        }
      }
      
      // Prepend extracted styles to content
      if (extractedStyles) {
        content = extractedStyles + '\n' + content
      }
    } catch (error: any) {
      console.error('Error reading landing page file:', {
        error: error.message,
        code: error.code,
        path: error.path,
        content: page.content,
        productSlug: product.slug,
        pageSlug: page.slug,
      })
      // Try alternative paths
      const altPaths = [
        `landing/${product.slug}.html`,
        `landing/${product.slug}-${page.slug}.html`,
        `landing/${page.slug}.html`,
      ]
      
      let found = false
      for (const altPath of altPaths) {
        try {
          const fullAltPath = join(process.cwd(), 'public', altPath)
          console.log('Trying alternative path:', fullAltPath)
          content = await readFile(fullAltPath, 'utf-8')
          found = true
          console.log('Successfully read from alternative path:', altPath)
          break
        } catch (altError) {
          // Continue to next path
        }
      }
      
      if (!found) {
        console.error('All file paths failed. Tried:', [filePath, ...altPaths])
        content = `<div style="padding: 2rem; text-align: center; color: white; background: #030712; min-height: 100vh;">
          <h1 style="color: #ef4444; margin-bottom: 1rem;">Error Loading Landing Page</h1>
          <p style="color: #9ca3af;">Could not find landing page file. Please check:</p>
          <ul style="text-align: left; display: inline-block; margin-top: 1rem; color: #9ca3af;">
            <li>public/landing/${product.slug}.html</li>
            <li>public/landing/${product.slug}-${page.slug}.html</li>
            <li>Or update the database content field with: /landing/filename.html</li>
          </ul>
          <p style="margin-top: 1rem; color: #6a6a8a; font-size: 0.9rem;">Database content field: ${page.content || '(empty)'}</p>
        </div>`
      }
    }
  }
  
  // Replace placeholders in content
  content = content
    .replace(/\{\{PRODUCT_NAME\}\}/g, product.name)
    .replace(/\{\{PRODUCT_PRICE\}\}/g, priceFormatted)
    .replace(/\{\{STRIPE_PRICE_ID\}\}/g, product.stripe_price_id || '')
    .replace(/\{\{AFF_CODE\}\}/g, affCode)
    .replace(/\{\{VISITOR_ID\}\}/g, visitorId)

  // Add checkout button script and styling
  const checkoutScript = `
    <script>
      function handleCheckout() {
        window.location.href = '/checkout';
      }

      // Also handle any buttons with data-checkout attribute
      document.addEventListener('DOMContentLoaded', function() {
        const checkoutButtons = document.querySelectorAll('[data-checkout], .checkout-button, #checkout-button');
        checkoutButtons.forEach(function(btn) {
          btn.addEventListener('click', handleCheckout);
          btn.style.cursor = 'pointer';
        });
      });
    </script>
  `

  return (
    <>
      <ProductCookieSetter productSlug={product.slug} />
      <div
        className="landing-page-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div dangerouslySetInnerHTML={{ __html: checkoutScript }} />
      <style dangerouslySetInnerHTML={{
        __html: `
          .landing-page-content {
            min-height: 100vh;
          }
          .landing-page-content img {
            max-width: 100%;
            height: auto;
          }
          .landing-page-content > * {
            max-width: 100%;
          }
        `
      }} />
    </>
  )
}
