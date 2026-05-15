import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ReadingExercise, Question } from './types'

const BASE = 'https://ieltsliz.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const DELAY = 1500

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function get(url: string): Promise<string> {
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 15000 })
  await sleep(DELAY)
  return data
}
const slug = (url: string) => url.replace(BASE + '/', '').replace(/\/$/, '').replace(/[^a-z0-9]/gi, '_').slice(0, 60)

function questionType(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('matching heading'))                              return 'matching_headings'
  if (t.includes('true') && t.includes('false'))                  return 'true_false_ng'
  if (t.includes('multiple choice'))                              return 'multiple_choice'
  if (t.includes('sentence completion'))                          return 'sentence_completion'
  if (t.includes('summary'))                                      return 'summary_completion'
  if (t.includes('short answer'))                                 return 'short_answer'
  if (t.includes('matching paragraph') || t.includes('which paragraph')) return 'matching_paragraph_info'
  return 'multiple_choice'
}

function extractPassage($: cheerio.CheerioAPI): string {
  const bq = $('blockquote').first().text().trim()
  if (bq.length > 200) return bq
  const paras: string[] = []
  $('.entry-content > p').each((_, el) => {
    const t = $(el).text().trim()
    if (t.length > 100 && !/ielts|click here|band score/i.test(t)) paras.push(t)
  })
  return paras.slice(0, 12).join('\n\n')
}

function extractQuestions($: cheerio.CheerioAPI, qType: string): Question[] {
  const qs: Question[] = []
  let idx = 0

  if (qType === 'true_false_ng') {
    $('.entry-content p, .entry-content li').each((_, el) => {
      const text = $(el).text().trim()
      if (/^[0-9]+[.)]\s/.test(text)) {
        const clean = text.replace(/^[0-9]+[.)]\s+/, '')
        const ans = /TRUE/.test(text) ? 'TRUE' : /FALSE/.test(text) ? 'FALSE' : 'NOT GIVEN'
        qs.push({ index: idx++, text: clean, answer: ans })
      }
    })
  } else if (qType === 'matching_headings') {
    $('ol li').each((_, el) => {
      const text = $(el).text().trim()
      if (text) qs.push({ index: idx++, text, answer: '', paragraph: String.fromCharCode(65 + idx - 1) })
    })
  } else {
    $('ol li').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 10) qs.push({ index: idx++, text, answer: '' })
    })
  }
  return qs.slice(0, 40)
}

export async function scrapeReading(): Promise<ReadingExercise[]> {
  const hub = await get(`${BASE}/ielts-reading-lessons-information-and-tips/`)
  const $h = cheerio.load(hub)

  const urls = new Set<string>()
  $h('a[href]').each((_, el) => {
    const href = $h(el).attr('href') || ''
    if (
      href.startsWith(BASE) &&
      (href.includes('reading') || href.includes('exercise') || href.includes('practice')) &&
      !href.endsWith('/ielts-reading-lessons-information-and-tips/') &&
      !href.includes('#') &&
      !href.includes('category')
    ) urls.add(href)
  })

  const exercises: ReadingExercise[] = []

  for (const url of [...urls].slice(0, 20)) {
    try {
      const html = await get(url)
      const $ = cheerio.load(html)
      const title = $('h1').first().text().trim()
      const passage = extractPassage($)
      if (passage.length < 100) continue
      const qType = questionType(title + ' ' + $('.entry-content').text())
      exercises.push({
        id: slug(url),
        title,
        source_url: url,
        passage,
        question_type: qType,
        difficulty: 'medium',
        questions: extractQuestions($, qType),
      })
    } catch (e) {
      console.warn(`  skip ${url}: ${e}`)
    }
  }
  return exercises
}
