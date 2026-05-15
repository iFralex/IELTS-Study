import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ListeningExercise, Question } from './types'

const BASE = 'https://ieltsliz.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const DELAY = 1500

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function get(url: string): Promise<string> {
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 15000 })
  await sleep(DELAY)
  return data
}

function slug(url: string): string {
  return url.replace(BASE + '/', '').replace(/\/$/, '').replace(/[^a-z0-9]/gi, '_').slice(0, 60)
}

function youtubeUrl($: cheerio.CheerioAPI): string {
  const src = $('iframe').first().attr('src') || $('iframe').first().attr('data-src') || ''
  return src.startsWith('//') ? 'https:' + src : src
}

function questionType(title: string, body: string): ListeningExercise['question_type'] {
  const t = (title + ' ' + body).toLowerCase()
  if (t.includes('form'))            return 'form_completion'
  if (t.includes('multiple choice')) return 'multiple_choice'
  if (t.includes('map') || t.includes('diagram') || t.includes('label')) return 'map_diagram'
  if (t.includes('table'))           return 'table'
  return 'gap_fill'
}

function extractQuestions($: cheerio.CheerioAPI): Question[] {
  const qs: Question[] = []
  let idx = 0
  $('.entry-content ol li').each((_, el) => {
    const text = $(el).text().trim()
    if (text) qs.push({ index: idx++, text, answer: $(el).find('.answer').text().trim() })
  })
  if (qs.length === 0) {
    $('.entry-content p').each((_, el) => {
      const text = $(el).text().trim()
      if (/^\d+[\.\)]\s/.test(text)) {
        qs.push({ index: idx++, text: text.replace(/^\d+[\.\)]\s+/, ''), answer: '' })
      }
    })
  }
  return qs.slice(0, 40)
}

export async function scrapeListening(): Promise<ListeningExercise[]> {
  const hub = await get(`${BASE}/ielts-listening/`)
  const $h = cheerio.load(hub)

  const urls = new Set<string>()
  $h('a[href]').each((_, el) => {
    const href = $h(el).attr('href') || ''
    if (
      href.startsWith(BASE) &&
      href.includes('listen') &&
      !href.endsWith('/ielts-listening/') &&
      !href.includes('#') &&
      !href.includes('category')
    ) urls.add(href)
  })

  const exercises: ListeningExercise[] = []

  for (const url of [...urls].slice(0, 25)) {
    try {
      const html = await get(url)
      const $ = cheerio.load(html)
      const title = $('h1').first().text().trim()
      const yt = youtubeUrl($)
      if (!yt) continue
      exercises.push({
        id: slug(url),
        title,
        source_url: url,
        youtube_url: yt,
        question_type: questionType(title, $('.entry-content').text()),
        difficulty: 'medium',
        questions: extractQuestions($),
      })
    } catch (e) {
      console.warn(`  skip ${url}: ${e}`)
    }
  }
  return exercises
}
