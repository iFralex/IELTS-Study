import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ListeningExercise, Question } from './types'

const BASE = 'https://ieltsliz.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const DELAY = 1500

// Complete hardcoded list — all 31 exercises from the listening hub
const EXERCISE_URLS = [
  'https://ieltsliz.com/ielts-listening-multiple-choice-essential-tips/',
  'https://ieltsliz.com/ielts-map-listening-practice/',
  'https://ieltsliz.com/ielts-listening-diagrams-practice-tips/',
  'https://ieltsliz.com/listening-multiple-choice-practice-moles/',
  'https://ieltsliz.com/ielts-listening-practice-nadiya-hussain/',
  'https://ieltsliz.com/ielts-listening-section-4-practice/',
  'https://ieltsliz.com/listening-practice-summary-completion-questions/',
  'https://ieltsliz.com/ielts-listening-practice-tables/',
  'https://ieltsliz.com/ielts-multiple-choice-listening-turtles/',
  'https://ieltsliz.com/ielts-listening-practice-gap-fill-question/',
  'https://ieltsliz.com/form-completion-ielts-listening-practice/',
  'https://ieltsliz.com/ielts-listening-gap-fill-practice-lesson/',
  'https://ieltsliz.com/ielts-listening-practice-lesson/',
  'https://ieltsliz.com/listening-practice-plastic-straws/',
  'https://ieltsliz.com/listening-practice-for-numbers/',
  'https://ieltsliz.com/new-year-in-vietnam-ielts-listening-practice/',
  'https://ieltsliz.com/multiple-choice-question-ielts-listening/',
  'https://ieltsliz.com/ielts-listening-practice-missing-words/',
  'https://ieltsliz.com/map-completion-question-ielts-listening/',
  'https://ieltsliz.com/brain-drain-listening/',
  'https://ieltsliz.com/ielts-listening-practice-sports-festival/',
  'https://ieltsliz.com/ielts-listening-list-selection/',
  'https://ieltsliz.com/listening-practice-my-university/',
  'https://ieltsliz.com/ielts-listening-practice-the-eiffel-tower/',
  'https://ieltsliz.com/listening-practice-blue-footed-boobies/',
  'https://ieltsliz.com/listening-practice-for-addresses/',
  'https://ieltsliz.com/alphabet-practice-for-spelling/',
  'https://ieltsliz.com/listening-dictation-practice/',
  'https://ieltsliz.com/listening-practice-for-english-names/',
  'https://ieltsliz.com/listening-practice-big-numbers/',
  'https://ieltsliz.com/ielts-listening-for-plurals-tips-practice/',
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function get(url: string): Promise<string> {
  const normalized = url.replace('http://www.ieltsliz.com', BASE).replace('http://ieltsliz.com', BASE)
  const { data } = await axios.get(normalized, { headers: { 'User-Agent': UA }, timeout: 15000 })
  await sleep(DELAY)
  return data
}

function slug(url: string): string {
  return url.replace(/https?:\/\/(www\.)?ieltsliz\.com\//, '')
    .replace(/\/$/, '').replace(/[^a-z0-9]/gi, '_').slice(0, 60)
}

function audioUrl($: cheerio.CheerioAPI): string {
  let found = ''
  // HTML5 <audio> src
  $('audio source, audio').each((_, el) => {
    const src = $(el).attr('src') || ''
    if (/\.(mp3|mp4|m4a|ogg|wav)/i.test(src)) { found = src; return false }
  })
  if (found) return found
  // <a href> mp3/audio links
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (/\.(mp3|mp4|m4a|ogg|wav)/i.test(href)) { found = href; return false }
  })
  return found
}

function questionType(title: string, url: string): ListeningExercise['question_type'] {
  const t = (title + ' ' + url).toLowerCase()
  if (t.includes('form'))                                              return 'form_completion'
  if (t.includes('multiple choice') || t.includes('multiple-choice')) return 'multiple_choice'
  if (t.includes('map') || t.includes('diagram') || t.includes('label')) return 'map_diagram'
  if (t.includes('table'))                                             return 'table'
  return 'gap_fill'
}

function extractAnswers($: cheerio.CheerioAPI): string[] {
  const answers: string[] = []
  const fullText = $('.entry-content').text()
  // Find the ANSWERS block — everything after "answers" heading until double newline or next heading
  const m = fullText.match(/\banswers?\b[:\s\n]+([\s\S]{1,800}?)(?:\n{2,}|\bTranscript\b|$)/i)
  const block = m ? m[1] : ''
  for (const line of block.split('\n').map(l => l.trim()).filter(Boolean)) {
    const numbered = line.match(/^(\d+)[.)]\s+(.+)/)
    if (numbered) answers.push(numbered[2].trim())
    else if (answers.length > 0 && /^[A-Z]/.test(line) && line.length < 60) {
      // Continuation — bare answer word(s)
      answers.push(line)
    }
  }
  return answers
}

function extractQuestions($: cheerio.CheerioAPI): Question[] {
  const answers = extractAnswers($)
  const qs: Question[] = []
  let idx = 0

  // <ol> list items
  $('.entry-content ol li').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ')
    if (text.length > 3 && text.length < 300) {
      qs.push({ index: idx, text, answer: answers[idx] || '' })
      idx++
    }
  })

  // Fallback: numbered paragraphs "1. ..." or "1) ..."
  if (qs.length === 0) {
    $('.entry-content p').each((_, el) => {
      const text = $(el).text().trim()
      const numbered = text.match(/^(\d+)[.)]\s+(.{5,200})/)
      if (numbered) {
        qs.push({ index: idx, text: numbered[2].replace(/\s+/g, ' '), answer: answers[idx] || '' })
        idx++
      }
    })
  }

  // Ensure answers don't get lost if questions weren't extracted
  while (idx < answers.length) {
    qs.push({ index: idx, text: `Question ${idx + 1}`, answer: answers[idx] })
    idx++
  }

  return qs.slice(0, 40)
}

export async function scrapeListening(): Promise<ListeningExercise[]> {
  const exercises: ListeningExercise[] = []

  for (const url of EXERCISE_URLS) {
    try {
      const html = await get(url)
      const $ = cheerio.load(html)
      const title = $('h1').first().text().trim()
      const audio = audioUrl($)
      exercises.push({
        id: slug(url),
        title,
        source_url: url,
        audio_url: audio,
        question_type: questionType(title, url),
        difficulty: 'medium',
        questions: extractQuestions($),
      })
    } catch (e) {
      console.warn(`  skip ${url}: ${e}`)
    }
  }
  return exercises
}
