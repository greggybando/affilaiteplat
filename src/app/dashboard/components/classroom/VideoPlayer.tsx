'use client'

interface VideoPlayerProps {
  videoId?: string
  loomId?: string
  youtubeId?: string
  title: string
}

export function VideoPlayer({ videoId, loomId, youtubeId, title }: VideoPlayerProps) {
  if (youtubeId) {
    return (
      <iframe
        key={`${videoId}-${youtubeId}`}
        src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full absolute inset-0"
        title={title}
        loading="eager"
      />
    )
  }

  if (loomId) {
    return (
      <iframe
        key={`${videoId}-${loomId}`}
        src={`https://www.loom.com/embed/${loomId}`}
        frameBorder="0"
        allowFullScreen
        className="w-full h-full absolute inset-0"
        title={title}
        loading="eager"
      />
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <p className="text-slate-400">Video URL not available</p>
    </div>
  )
}

