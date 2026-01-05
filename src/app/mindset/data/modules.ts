export interface WorksheetField {
  id: string
  type: 'text' | 'textarea' | 'yesno' | 'number'
  label: string
  placeholder?: string
  helpText?: string
  required?: boolean
}

export interface WorksheetStep {
  id: string
  title: string
  description?: string
  fields: WorksheetField[]
}

export interface Worksheet {
  id: string
  title: string
  intro?: string
  steps: WorksheetStep[]
}

export interface ModuleVideo {
  id: string
  title: string
  duration: string
  videoUrl: string
}

export interface Module {
  id: number
  title: string
  description: string
  videos: ModuleVideo[]
  worksheet: Worksheet
}

export const mindsetModules: Module[] = [
  {
    id: 1,
    title: 'Figuring Out What\'s Wrong',
    description: 'Diagnose what\'s not working in your life and create a plan to fix it.',
    videos: [
      { id: 'v1-1', title: 'Welcome to Life Design', duration: '5:00', videoUrl: '' },
      { id: 'v1-2', title: 'How This Process Works', duration: '8:00', videoUrl: '' },
    ],
    worksheet: {
      id: 'diagnosis-worksheet',
      title: 'The Diagnosis Worksheet',
      intro: 'This worksheet has 5 steps. Do them in order. Be honest — nobody sees this but you. Welcome to healing. Welcome to power. Welcome to a life you fucking love.',
      steps: [
        {
          id: 'step-1',
          title: 'What do you NOT like about your life right now?',
          description: 'Write down things you don\'t like about your life — focus on the big, annoying, and obvious ones first.',
          fields: [
            { id: 'dislike-1', type: 'textarea', label: '1', placeholder: 'e.g., "I don\'t like my job"', required: true },
            { id: 'dislike-2', type: 'textarea', label: '2', placeholder: 'e.g., "I\'m broke at the end of every month"' },
            { id: 'dislike-3', type: 'textarea', label: '3', placeholder: 'e.g., "I have no free time"' },
            { id: 'dislike-4', type: 'textarea', label: '4', placeholder: 'e.g., "My boss treats me like garbage"' },
            { id: 'dislike-5', type: 'textarea', label: '5', placeholder: 'Add more if needed' },
          ]
        },
        {
          id: 'step-2',
          title: 'Pick the MOST pressing one weighing heaviest on your soul',
          description: 'Which one, if removed or changed, would give you the most breathing room / fresh air?',
          fields: [
            { id: 'most-pressing', type: 'textarea', label: 'The most pressing problem I need to remove right now:', placeholder: 'Write the one thing that weighs heaviest...', required: true },
          ]
        },
        {
          id: 'step-3',
          title: 'Figure out the REAL problem',
          description: 'Keep asking "If that was fixed, would I be happy?" until you hit YES.',
          fields: [
            { id: 'why-sucks', type: 'textarea', label: 'Why does it suck?', placeholder: 'e.g., "I don\'t make enough money"', required: true },
            { id: 'if-fixed-1', type: 'yesno', label: 'If that was fixed, would you be happy?', required: true },
            { id: 'what-else-1', type: 'textarea', label: 'If NO — what else is wrong?', placeholder: 'e.g., "I also don\'t like waking up at 6am"' },
            { id: 'if-fixed-2', type: 'yesno', label: 'If THAT was also fixed, would you be happy?' },
            { id: 'what-else-2', type: 'textarea', label: 'If NO — what else?', placeholder: 'Keep going until you hit the real problem...' },
            { id: 'real-problem', type: 'textarea', label: 'THE REAL PROBLEM IS:', placeholder: 'Write the thing you landed on after all your YES/NO questions', required: true },
          ]
        },
        {
          id: 'step-4',
          title: 'Is there someone making you feel "stuck"?',
          description: 'We often only allow shitty situations to continue because we\'re afraid to tell a specific person.',
          fields: [
            { id: 'someone-stuck', type: 'yesno', label: 'Is there someone like this in your life?', required: true },
            { id: 'who-stuck', type: 'text', label: 'If YES — who is it?', placeholder: 'Name or relationship' },
            { id: 'what-to-say', type: 'textarea', label: 'What do you want to say to them to free yourself?', placeholder: 'Dump fully. Get it all out on paper.' },
          ]
        },
        {
          id: 'step-5',
          title: 'What is your EXACT next step?',
          description: 'The ONE very simple big scary step that would basically solve everything in one swoop.',
          fields: [
            { id: 'game-plan', type: 'textarea', label: 'Write your gameplan — the big scary step:', placeholder: 'e.g., "1) Make $1 online to prove I can do it..."', required: true },
          ]
        },
      ]
    }
  },
  {
    id: 2,
    title: 'Module 2 - Coming Soon',
    description: 'This module is coming soon. Complete Module 1 first.',
    videos: [],
    worksheet: { id: 'module-2-worksheet', title: 'Module 2 Worksheet', intro: 'Coming soon...', steps: [] }
  },
  {
    id: 3,
    title: 'Module 3 - Coming Soon',
    description: 'This module is coming soon.',
    videos: [],
    worksheet: { id: 'module-3-worksheet', title: 'Module 3 Worksheet', intro: 'Coming soon...', steps: [] }
  },
]

export function getModule(id: number): Module | undefined {
  return mindsetModules.find(m => m.id === id)
}

export function getTotalModules(): number {
  return mindsetModules.length
}



