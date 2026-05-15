import axios from 'axios'
import * as cheerio from 'cheerio'
import type { WritingTask1, WritingTask2 } from './types'

const BASE = 'https://ieltsliz.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const DELAY = 1500

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
async function get(url: string): Promise<string> {
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 15000 })
  await sleep(DELAY)
  return data
}
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50)

function chartType(text: string): WritingTask1['chart_type'] {
  const t = text.toLowerCase()
  if (t.includes('bar'))     return 'bar'
  if (t.includes('line'))    return 'line'
  if (t.includes('pie'))     return 'pie'
  if (t.includes('table'))   return 'table'
  if (t.includes('map'))     return 'map'
  return 'process'
}

function essayType(text: string): WritingTask2['essay_type'] {
  const t = text.toLowerCase()
  if (t.includes('do you agree') || t.includes('to what extent')) return 'opinion'
  if (t.includes('discuss both'))                                 return 'discussion'
  if (t.includes('problem') || t.includes('cause'))              return 'problem_solution'
  if (t.includes('advantage') || t.includes('disadvantage'))     return 'advantages_disadvantages'
  return 'direct_question'
}

function extractModelAnswer($: cheerio.CheerioAPI): string {
  let model = ''
  $('.entry-content h2, .entry-content h3').each((_, el) => {
    if (/model answer|sample answer/i.test($(el).text())) {
      const parts: string[] = []
      let sib = $(el).next()
      while (sib.length && !sib.is('h2,h3')) {
        parts.push(sib.text().trim())
        sib = sib.next()
      }
      model = parts.filter(Boolean).join('\n\n')
    }
  })
  return model
}

async function scrapeTask1(): Promise<WritingTask1[]> {
  const hub = await get(`${BASE}/ielts-writing-task-1-lessons-and-tips/`)
  const $h = cheerio.load(hub)
  const urls = new Set<string>()
  $h('a[href]').each((_, el) => {
    const href = $h(el).attr('href') || ''
    if (
      href.startsWith(BASE) &&
      (href.includes('task-1') || href.includes('writing')) &&
      !href.endsWith('/ielts-writing-task-1-lessons-and-tips/') &&
      !href.includes('#') && !href.includes('category')
    ) urls.add(href)
  })

  const tasks: WritingTask1[] = []
  for (const url of [...urls].slice(0, 20)) {
    try {
      const html = await get(url)
      const $ = cheerio.load(html)
      const title = $('h1').first().text().trim()
      const prompt = $('blockquote').first().text().trim() || $('.entry-content p').first().text().trim()
      if (!prompt || prompt.length < 30) continue
      tasks.push({
        id: slug(title),
        chart_type: chartType(title + ' ' + prompt),
        prompt,
        image_url: $('.entry-content img').first().attr('src') || '',
        model_answer: extractModelAnswer($),
        band_target: 7,
        key_vocab: [],
      })
    } catch (e) { console.warn(`  skip ${url}: ${e}`) }
  }
  return tasks
}

async function scrapeTask2(): Promise<WritingTask2[]> {
  const tasks: WritingTask2[] = []

  try {
    const html = await get(`${BASE}/100-ielts-essay-questions/`)
    const $ = cheerio.load(html)
    let i = 0
    $('.entry-content p, .entry-content li').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 40 && (text.includes('?') || /discuss|agree|extent/i.test(text))) {
        tasks.push({ id: `task2_q${i++}`, topic: 'General', essay_type: essayType(text), question: text, model_answer: '', band_target: 7, key_phrases: [] })
      }
    })
  } catch (e) { console.warn('  skip essay questions:', e) }

  try {
    const hub = await get(`${BASE}/ielts-writing-task-2/`)
    const $h = cheerio.load(hub)
    const urls = new Set<string>()
    $h('a[href]').each((_, el) => {
      const href = $h(el).attr('href') || ''
      if (href.startsWith(BASE) && (href.includes('task-2') || href.includes('essay')) && !href.endsWith('/ielts-writing-task-2/') && !href.includes('#') && !href.includes('category')) urls.add(href)
    })
    for (const url of [...urls].slice(0, 15)) {
      try {
        const html = await get(url)
        const $ = cheerio.load(html)
        const title = $('h1').first().text().trim()
        const prompt = $('blockquote').first().text().trim() || $('.entry-content p').first().text().trim()
        if (!prompt || prompt.length < 30) continue
        tasks.push({ id: slug(title), topic: title, essay_type: essayType(prompt), question: prompt, model_answer: extractModelAnswer($), band_target: 7, key_phrases: [] })
      } catch (e) { console.warn(`  skip ${url}: ${e}`) }
    }
  } catch (e) { console.warn('  skip task2 hub:', e) }

  return tasks
}

export async function scrapeWriting(): Promise<{ task1: WritingTask1[]; task2: WritingTask2[] }> {
  return { task1: await scrapeTask1(), task2: await scrapeTask2() }
}
