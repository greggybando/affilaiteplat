// Script to update "The Great Unlearning" checkpoint requirements
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/update-great-unlearning.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateCheckpoint() {
  try {
    console.log('Finding Dream Job category...')
    // Find the Dream Job category
    const { data: category, error: catError } = await supabase
      .from('course_categories')
      .select('id')
      .eq('course_type', 'dreamjob')
      .eq('category_id', 'main')
      .single()

    if (catError || !category) {
      console.error('Dream Job category not found:', catError)
      return
    }

    console.log('Finding THE GREAT UNLEARNING section...')
    // Find "THE GREAT UNLEARNING" section (section_id = 2)
    const { data: section, error: secError } = await supabase
      .from('course_sections')
      .select('id, title, section_id')
      .eq('category_id', category.id)
      .eq('section_id', 2)
      .single()

    if (secError || !section) {
      console.error('THE GREAT UNLEARNING section not found:', secError)
      return
    }

    console.log('Found section:', section.title, 'ID:', section.id)

    // Find the checkpoint for this section
    const { data: checkpoint, error: cpError } = await supabase
      .from('checkpoints')
      .select('id, title, requirements')
      .eq('section_id', section.id)
      .single()

    if (cpError || !checkpoint) {
      console.error('Checkpoint not found for THE GREAT UNLEARNING section:', cpError)
      return
    }

    console.log('Current checkpoint:', checkpoint.title)
    console.log('Current requirements:', checkpoint.requirements)

    // Update requirements to be simpler
    const newRequirements = 'Submit a sentence explaining what you learned from "The Great Unlearning" module.'

    console.log('Updating checkpoint...')
    const { data: updated, error: updateError } = await supabase
      .from('checkpoints')
      .update({ requirements: newRequirements })
      .eq('id', checkpoint.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating checkpoint:', updateError)
      return
    }

    console.log('✅ Checkpoint updated successfully!')
    console.log('New requirements:', updated.requirements)

  } catch (error) {
    console.error('Error:', error)
  }
}

updateCheckpoint()

