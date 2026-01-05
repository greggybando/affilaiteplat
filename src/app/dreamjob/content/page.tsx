import { DreamJobModuleList } from '../components/DreamJobModuleList'

// Helper function to extract YouTube ID from URL
function extractYouTubeId(url: string): string {
  if (!url) return ''
  // Handle youtu.be format
  if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1].split('?')[0].split('&')[0]
  }
  // Handle youtube.com format
  if (url.includes('youtube.com/watch?v=')) {
    return url.split('youtube.com/watch?v=')[1].split('&')[0]
  }
  // Handle youtube.com/embed format
  if (url.includes('youtube.com/embed/')) {
    return url.split('youtube.com/embed/')[1].split('?')[0].split('&')[0]
  }
  return url
}

const modules = [
  {
    id: 1,
    number: 1,
    title: 'INTRO',
    description: 'Get started with the Dream Job program',
    videos: [
      { 
        id: 'v1-1', 
        title: 'House Rules', 
        youtubeId: extractYouTubeId('https://youtu.be/tKCQuBJcOJI')
      },
    ]
  },
  {
    id: 2,
    number: 2,
    title: 'THE GREAT UNLEARNING',
    description: 'Unlearn the broken job search advice',
    videos: [
      { 
        id: 'v2-1', 
        title: 'The great unlearning lesson 1', 
        youtubeId: extractYouTubeId('https://youtu.be/PfgsbC2OQ3w')
      },
      { 
        id: 'v2-2', 
        title: 'The great unlearning lesson 2', 
        youtubeId: extractYouTubeId('https://youtu.be/9AK-qoJ4QD0')
      },
      { 
        id: 'v2-3', 
        title: 'Great unlearning lesson 3', 
        youtubeId: extractYouTubeId('https://youtu.be/MZZ1gnfA1Uc')
      },
      { 
        id: 'v2-4', 
        title: 'Lesson 4', 
        youtubeId: extractYouTubeId('https://youtu.be/a6oT475-bNA')
      },
      { 
        id: 'v2-5', 
        title: 'Lesson 5', 
        youtubeId: extractYouTubeId('https://youtu.be/M_IYaTtr0F0')
      },
      { 
        id: 'v2-6', 
        title: 'Lesson 6', 
        youtubeId: extractYouTubeId('https://youtu.be/7npWIycpkfE')
      },
      { 
        id: 'v2-7', 
        title: 'Lesson 7', 
        youtubeId: extractYouTubeId('https://youtu.be/ll75o_cW0uo')
      },
      { 
        id: 'v2-8', 
        title: 'Lesson 8', 
        youtubeId: '' // Missing URL
      },
    ]
  },
  {
    id: 3,
    number: 3,
    title: 'KNOW THYSELF',
    description: 'Discover your unique strengths and values',
    videos: [
      { 
        id: 'v3-1', 
        title: 'Know thyself: Lesson 1', 
        youtubeId: extractYouTubeId('https://youtu.be/m7SE3iT41ZU')
      },
      { 
        id: 'v3-2', 
        title: 'Lesson 2', 
        youtubeId: extractYouTubeId('https://youtu.be/cMp3D7etkeQ')
      },
      { 
        id: 'v3-3', 
        title: 'Lesson 3', 
        youtubeId: extractYouTubeId('https://youtu.be/-K3KsXLHARw')
      },
    ]
  },
  {
    id: 4,
    number: 4,
    title: 'RESEARCH LIKE HEAVEN',
    description: 'Master the art of company and role research',
    videos: [
      { 
        id: 'v4-1', 
        title: 'Research like heaven: Lesson 1', 
        youtubeId: extractYouTubeId('https://youtu.be/AJf9LB2Le3Y')
      },
      { 
        id: 'v4-2', 
        title: 'Lesson 2', 
        youtubeId: extractYouTubeId('https://youtu.be/ilL-E1ks8XU')
      },
      { 
        id: 'v4-3', 
        title: '3', 
        youtubeId: extractYouTubeId('https://youtu.be/U1RAtTAwNxA')
      },
      { 
        id: 'v4-4', 
        title: '3 part 2', 
        youtubeId: extractYouTubeId('https://youtu.be/QxKkCazV2NY')
      },
    ]
  },
  {
    id: 5,
    number: 5,
    title: 'TRIAL PROJECT',
    description: 'Create work samples that prove your value',
    videos: [
      { 
        id: 'v5-1', 
        title: 'Trial Project: Lesson 1', 
        youtubeId: extractYouTubeId('https://youtu.be/z3IX2ACDXNs')
      },
      { 
        id: 'v5-2', 
        title: 'Lesson 2', 
        youtubeId: extractYouTubeId('https://youtu.be/E9sBYsPmhw8')
      },
      { 
        id: 'v5-3', 
        title: 'Lesson 3', 
        youtubeId: extractYouTubeId('https://youtu.be/jd3wQ3k7Nlk')
      },
      { 
        id: 'v5-4', 
        title: 'Lesson 4', 
        youtubeId: extractYouTubeId('https://youtu.be/xpcpLPdDU_A')
      },
      { 
        id: 'v5-5', 
        title: 'Lesson 5', 
        youtubeId: extractYouTubeId('https://youtu.be/tbWygenb3iI')
      },
      { 
        id: 'v5-6', 
        title: 'Lesson 6', 
        youtubeId: extractYouTubeId('https://youtu.be/GRVoPEB9yBI')
      },
    ]
  },
  {
    id: 6,
    number: 6,
    title: 'REACH ANYONE IN THE WORLD',
    description: 'Learn how to connect with decision makers',
    videos: [
      { 
        id: 'v6-1', 
        title: 'Reach Anyone In The World: Lesson 1', 
        youtubeId: extractYouTubeId('https://youtu.be/aK45c5bjEms')
      },
      { 
        id: 'v6-2', 
        title: 'Lesson 2', 
        youtubeId: extractYouTubeId('https://youtu.be/FPb7qVArelg')
      },
      { 
        id: 'v6-3', 
        title: 'Lesson 3', 
        youtubeId: extractYouTubeId('https://youtu.be/1ehr1fk9sY8')
      },
    ]
  },
  {
    id: 7,
    number: 7,
    title: 'ACING EVERY INTERVIEW',
    description: 'Turn interviews into conversations and job offers',
    videos: [
      { 
        id: 'v7-1', 
        title: 'Acing Every Interview: Lesson 1 (master lesson)', 
        youtubeId: extractYouTubeId('https://youtu.be/fyeoO8EzD6w')
      },
    ]
  },
  {
    id: 8,
    number: 8,
    title: 'FINAL FIRST IMPRESSION',
    description: 'Close the deal and start your dream job',
    videos: [
      { 
        id: 'v8-1', 
        title: 'Final First Impression: Master lesson', 
        youtubeId: extractYouTubeId('https://youtu.be/AkF6LvlvroY')
      },
      { 
        id: 'v8-2', 
        title: 'Lesson 6 final adjustment Bonus video', 
        youtubeId: extractYouTubeId('https://youtu.be/qXjuyco6RQw')
      },
    ]
  },
]

export default function DreamJobContentPage() {
  return (
    <div>
      {/* Progress Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Course Progress</h2>
            <p className="text-slate-400 text-sm">Complete all 8 modules to master the Dream Job method</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">0%</span>
            <p className="text-slate-500 text-sm">Complete</p>
          </div>
        </div>
        <div className="w-full bg-slate-700/50 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Module List with Video Player */}
      <DreamJobModuleList modules={modules} />
    </div>
  )
}
