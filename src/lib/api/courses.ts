import { Course, Module, Lesson, Checkpoint, UserCheckpoint } from '@/lib/types/courses'

/**
 * Fetch all courses, optionally filtered by type
 */
export async function fetchCourses(type?: 'foundation' | 'skillbank'): Promise<Course[]> {
  try {
    const url = type 
      ? `/api/courses-v2?type=${type}`
      : '/api/courses-v2'
    
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Failed to fetch courses: ${res.statusText}`)
    }
    
    const data = await res.json()
    return data.courses || []
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw error
  }
}

/**
 * Fetch a single course with its modules (sections)
 */
export async function fetchCourseWithModules(courseId: string): Promise<{course: Course, modules: Module[]}> {
  try {
    // Fetch course details
    const courseRes = await fetch(`/api/courses-v2?courseId=${courseId}`)
    if (!courseRes.ok) {
      throw new Error(`Failed to fetch course: ${courseRes.statusText}`)
    }
    const courseData = await courseRes.json()
    
    // Fetch modules (sections) for this course
    const modulesRes = await fetch(`/api/courses-v2/${courseId}/sections`)
    if (!modulesRes.ok) {
      throw new Error(`Failed to fetch modules: ${modulesRes.statusText}`)
    }
    const modulesData = await modulesRes.json()
    
    return {
      course: courseData.course || courseData,
      modules: modulesData.sections || []
    }
  } catch (error) {
    console.error('Error fetching course with modules:', error)
    throw error
  }
}

/**
 * Fetch all lessons for a module (section)
 */
export async function fetchLessons(moduleId: string): Promise<Lesson[]> {
  try {
    // Note: The API requires courseId and sectionId, but we only have moduleId
    // We'll need to fetch via a different endpoint or modify the API
    // For now, this is a placeholder that matches the expected signature
    const res = await fetch(`/api/courses-v2/lessons?moduleId=${moduleId}`)
    if (!res.ok) {
      throw new Error(`Failed to fetch lessons: ${res.statusText}`)
    }
    
    const data = await res.json()
    return data.lessons || []
  } catch (error) {
    console.error('Error fetching lessons:', error)
    throw error
  }
}

/**
 * Fetch checkpoints for a course
 */
export async function fetchCheckpoints(courseId: string): Promise<Checkpoint[]> {
  try {
    const res = await fetch(`/api/checkpoints/by-course-v2?courseId=${courseId}`)
    if (!res.ok) {
      throw new Error(`Failed to fetch checkpoints: ${res.statusText}`)
    }
    
    const data = await res.json()
    // The API returns byUUID (Record) and checkpoints (array)
    // Return the array, or convert the map to array if needed
    if (data.checkpoints && Array.isArray(data.checkpoints)) {
      return data.checkpoints
    }
    if (data.byUUID) {
      return Object.values(data.byUUID)
    }
    return []
  } catch (error) {
    console.error('Error fetching checkpoints:', error)
    throw error
  }
}

/**
 * Fetch user checkpoints for a course
 */
export async function fetchUserCheckpoints(userId: string, courseId: string): Promise<UserCheckpoint[]> {
  try {
    const res = await fetch(`/api/checkpoints/user?userId=${userId}&courseId=${courseId}`)
    if (!res.ok) {
      throw new Error(`Failed to fetch user checkpoints: ${res.statusText}`)
    }
    
    const data = await res.json()
    return data.checkpoints || []
  } catch (error) {
    console.error('Error fetching user checkpoints:', error)
    throw error
  }
}

