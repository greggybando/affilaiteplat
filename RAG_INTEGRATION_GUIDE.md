# RAG System Integration Guide

## ✅ Completed Steps

1. ✅ API route copied to `src/app/api/course-assistant/route.ts`
2. ✅ Component copied to `src/components/CourseAssistant.tsx`
3. ✅ Packages installed: `@anthropic-ai/sdk` and `openai`

## 📋 Required Environment Variables

Add these to your `.env.local` file:

```env
# Existing Supabase variables (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# New variables for RAG system
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

### How to get these keys:

1. **ANTHROPIC_API_KEY**: 
   - Sign up at https://console.anthropic.com/
   - Create an API key in the dashboard
   - Copy the key

2. **OPENAI_API_KEY**:
   - Sign up at https://platform.openai.com/
   - Go to API Keys section
   - Create a new secret key
   - Copy the key

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - Go to your Supabase project settings
   - Navigate to API settings
   - Copy the "service_role" key (not the anon key)

## 🗄️ Database Setup

Before using the RAG system, you need to:

1. **Run the SQL setup script** in your Supabase SQL Editor:
   - Copy the contents of `rag_system/supabase_setup.sql`
   - Paste into Supabase SQL Editor
   - Execute

2. **Upload the course content**:
   - Make sure you have Python 3 installed
   - Install dependencies: `pip install openai supabase python-dotenv`
   - Create a `.env` file in the `rag_system` folder with:
     ```
     OPENAI_API_KEY=your_openai_key
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_KEY=your_service_role_key
     ```
   - Run: `python upload_to_supabase.py` from the `rag_system` folder

## 🎨 Adding CourseAssistant to Dream Job Lesson Pages

Here's how to integrate the CourseAssistant component into your `DreamJobModuleList` component:

### Option 1: Add as a Sidebar Panel (Recommended)

Modify `src/app/dreamjob/components/DreamJobModuleList.tsx`:

```tsx
// Add this import at the top
import CourseAssistant from '@/components/CourseAssistant';

// In the return statement, modify the layout to include the assistant:
return (
  <div className="flex gap-6">
    {/* Left Sidebar - Course Navigation (existing) */}
    <div className="w-80 bg-slate-800/30 rounded-xl border-2 border-slate-700/50 overflow-hidden flex flex-col max-h-[calc(100vh-200px)] sticky top-4">
      {/* ... existing sidebar code ... */}
    </div>

    {/* Middle - Video Player (existing) */}
    <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/50">
      {/* ... existing video player code ... */}
    </div>

    {/* Right Sidebar - Course Assistant (NEW) */}
    <div className="w-96 flex-shrink-0">
      <div className="sticky top-4 h-[calc(100vh-200px)]">
        <CourseAssistant
          lessonId={selectedVideo?.video.id}
          lessonTitle={selectedVideo?.video.title}
          moduleName={modules.find(m => m.id === selectedVideo?.moduleId)?.title}
        />
      </div>
    </div>
  </div>
);
```

### Option 2: Add Below Video Player

If you prefer the assistant below the video:

```tsx
// Add this import at the top
import CourseAssistant from '@/components/CourseAssistant';

// In the video player section, add after the notes/attachments:
<div className="p-6 space-y-6">
  {/* ... existing video player and notes code ... */}
  
  {/* Course Assistant Section */}
  <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-6">
    <h3 className="text-lg font-semibold text-white mb-4">Course Assistant</h3>
    <div className="h-[600px]">
      <CourseAssistant
        lessonId={selectedVideo?.video.id}
        lessonTitle={selectedVideo?.video.title}
        moduleName={modules.find(m => m.id === selectedVideo?.moduleId)?.title}
      />
    </div>
  </div>
</div>
```

### Option 3: Floating Button (Minimal)

Add a floating button that opens a modal:

```tsx
// Add state for modal
const [showAssistant, setShowAssistant] = useState(false);

// Add floating button
{selectedVideo && (
  <>
    <button
      onClick={() => setShowAssistant(true)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition"
    >
      <Bot className="w-6 h-6" />
    </button>
    
    {showAssistant && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Course Assistant</h2>
            <button
              onClick={() => setShowAssistant(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 p-4">
            <CourseAssistant
              lessonId={selectedVideo?.video.id}
              lessonTitle={selectedVideo?.video.title}
              moduleName={modules.find(m => m.id === selectedVideo?.moduleId)?.title}
            />
          </div>
        </div>
      </div>
    )}
  </>
)}
```

## 🔍 Lesson ID Mapping

The `lessonId` prop should match the lesson IDs in your `chunks.json`. Make sure your video IDs in `DreamJobModuleList` match the `lesson_id` values in your RAG system chunks.

If they don't match, you may need to:
1. Update the video IDs in your modules data
2. Or create a mapping function to convert between formats

## 🧪 Testing

1. Start your dev server: `npm run dev`
2. Navigate to a Dream Job lesson page
3. The CourseAssistant should appear (depending on which integration option you chose)
4. Try asking a question like "What is this lesson about?"
5. The assistant should respond with relevant course content

## 🐛 Troubleshooting

- **"Failed to process request"**: Check that all environment variables are set correctly
- **"No results found"**: Make sure you've uploaded the course content to Supabase
- **"Function does not exist"**: Run the SQL setup script in Supabase
- **Component not showing**: Check that the import path is correct (`@/components/CourseAssistant`)

## 📝 Notes

- The assistant uses Claude Sonnet 4 for responses
- Embeddings are generated using OpenAI's `text-embedding-3-small` model
- The system prioritizes content from the current lesson, then searches globally
- Conversation history is maintained (last 10 messages) for context





