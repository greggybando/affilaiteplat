import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')
    const product = searchParams.get('product')

    if (!sessionId || !product) {
      return NextResponse.json(
        { error: 'session_id and product query params are required' },
        { status: 400 }
      )
    }

    // Get Stripe checkout session
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const session = await stripeResponse.json()

    if (!stripeResponse.ok || session.error) {
      console.error('Stripe API error:', session.error)
      return NextResponse.json(
        { error: session.error?.message || 'Failed to retrieve Stripe session' },
        { status: 500 }
      )
    }

    const customerEmail = session.customer_details?.email || session.customer_email

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'No email found in checkout session' },
        { status: 400 }
      )
    }

    // Create/update contact in ActiveCampaign
    const acApiUrl = process.env.ACTIVECAMPAIGN_API_URL
    const acApiKey = process.env.ACTIVECAMPAIGN_API_KEY

    if (!acApiUrl || !acApiKey) {
      console.error('ActiveCampaign credentials not configured')
      return NextResponse.json(
        { error: 'ActiveCampaign not configured' },
        { status: 500 }
      )
    }

    // Create tag name based on product (e.g., charisma-buyer)
    const tagName = `${product}-buyer`

    // First, get or create the tag
    const tagResponse = await fetch(`${acApiUrl}/api/3/tags`, {
      method: 'POST',
      headers: {
        'Api-Token': acApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag: {
          tag: tagName,
          tagType: 'contact',
        },
      }),
    })

    const tagData = await tagResponse.json()
    let tagId = tagData.tag?.id

    // If tag already exists, fetch it
    if (!tagId && tagResponse.status === 422) {
      const searchTagResponse = await fetch(
        `${acApiUrl}/api/3/tags?search=${encodeURIComponent(tagName)}`,
        {
          headers: {
            'Api-Token': acApiKey,
          },
        }
      )
      const searchTagData = await searchTagResponse.json()
      if (searchTagData.tags && searchTagData.tags.length > 0) {
        tagId = searchTagData.tags[0].id
      }
    }

    // Create or update contact
    const contactResponse = await fetch(`${acApiUrl}/api/3/contact/sync`, {
      method: 'POST',
      headers: {
        'Api-Token': acApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact: {
          email: customerEmail,
        },
      }),
    })

    const contactData = await contactResponse.json()
    const contactId = contactData.contact?.id

    if (!contactId) {
      return NextResponse.json(
        { error: 'Failed to create/update contact in ActiveCampaign' },
        { status: 500 }
      )
    }

    // Add contact to list 29
    await fetch(`${acApiUrl}/api/3/contactLists`, {
      method: 'POST',
      headers: {
        'Api-Token': acApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contactList: {
          list: '29',
          contact: contactId.toString(),
          status: '1', // Active
        },
      }),
    })

    // Add tag to contact if tagId exists
    if (tagId) {
      await fetch(`${acApiUrl}/api/3/contactTags`, {
        method: 'POST',
        headers: {
          'Api-Token': acApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactTag: {
            contact: contactId.toString(),
            tag: tagId.toString(),
          },
        }),
      })
    }

    return NextResponse.json({
      success: true,
      email: customerEmail,
      contactId,
      tagId,
      message: 'Contact added to ActiveCampaign',
    })
  } catch (error: any) {
    console.error('Error processing Stripe session:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

