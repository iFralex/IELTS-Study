import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ReadingExercise, Question } from './types'

const BASE = 'https://ieltsliz.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
const DELAY = 1500

// Complete hardcoded list — all 27 exercises from the reading hub
const EXERCISE_URLS = [
  'https://ieltsliz.com/true-false-not-given-ielts-reading-practice/',
  'https://ieltsliz.com/ielts-reading-multiple-choice/',
  'https://ieltsliz.com/reading-practice-about-ants/',
  'https://ieltsliz.com/ielts-reading-matching-headings/',
  'https://ieltsliz.com/ielts-yes-no-not-given-practice/',
  'https://ieltsliz.com/sentence-completion-questions-in-ielts-reading/',
  'https://ieltsliz.com/matching-paragraph-information-ielts-reading/',
  'https://ieltsliz.com/categorisation-practice-for-ielts-reading/',
  'https://ieltsliz.com/ielts-reading-using-online-translations-for-medical-purposes/',
  'https://ieltsliz.com/matching-headings-question-ielts-reading/',
  'https://ieltsliz.com/choosing-a-title-ielts-reading/',
  'https://ieltsliz.com/ielts-reading-multiple-choice-question/',
  'https://ieltsliz.com/ielts-reading-summary/',
  'https://ieltsliz.com/ielts-short-answer-questions-reading-practice/',
  'https://ieltsliz.com/crime-and-punishment-ielts-reading-exercise/',
  'https://ieltsliz.com/ielts-reading-practice-sentence-completion/',
  'https://ieltsliz.com/food-ielts-summary-reading-practice/',
  'https://ieltsliz.com/ielts-reading-matching-paragraph-information/',
  'https://ieltsliz.com/matching-sentence-endings-ielts-reading-practice/',
  'https://ieltsliz.com/ielts-matching-headings/',
  'https://ieltsliz.com/desertification-reading-exercise-useful-vocab/',
  'https://ieltsliz.com/ielts-reading-choosing-a-title/',
  'https://ieltsliz.com/ielts-reading-life-on-earth/',
  'https://ieltsliz.com/reading-skills-for-ielts-paraphrasing/',
  'https://ieltsliz.com/reading-skills-ielts-paraphrasing-2/',
  'https://ieltsliz.com/bird-dinosaur-synonym-practice/',
  'https://ieltsliz.com/ielts-reading-lessons-information-and-tips/',
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function get(url: string): Promise<string> {
  const { data } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 15000 })
  await sleep(DELAY)
  return data
}

const slug = (url: string) => url.replace(/https?:\/\/(www\.)?ieltsliz\.com\//, '')
  .replace(/\/$/, '').replace(/[^a-z0-9]/gi, '_').slice(0, 60)

function questionType(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('matching heading'))                                   return 'matching_headings'
  if ((t.includes('true') && t.includes('false')) || t.includes('tfng')) return 'true_false_ng'
  if (t.includes('yes') && t.includes('no'))                            return 'true_false_ng'
  if (t.includes('multiple choice'))                                    return 'multiple_choice'
  if (t.includes('sentence completion') || t.includes('sentence-completion')) return 'sentence_completion'
  if (t.includes('summary'))                                            return 'summary_completion'
  if (t.includes('short answer'))                                       return 'short_answer'
  if (t.includes('matching paragraph') || t.includes('which paragraph')) return 'matching_paragraph_info'
  if (t.includes('matching sentence') || t.includes('sentence ending')) return 'sentence_completion'
  if (t.includes('choosing a title') || t.includes('categoris'))        return 'multiple_choice'
  if (t.includes('diagram') || t.includes('label'))                     return 'sentence_completion'
  return 'multiple_choice'
}

function extractPassage($: cheerio.CheerioAPI): string {
  // Prefer blockquote (site often wraps passages there)
  const bq = $('blockquote').first().text().trim()
  if (bq.length > 150) return bq

  // Collect substantial paragraphs that look like passage text
  const paras: string[] = []
  $('.entry-content > p').each((_, el) => {
    const t = $(el).text().trim()
    if (
      t.length > 80 &&
      !/^(ielts|click|band score|tip:|note:|question|answer|passage|section|part)/i.test(t)
    ) paras.push(t)
  })
  return paras.slice(0, 15).join('\n\n')
}

function extractAnswers($: cheerio.CheerioAPI): string[] {
  const answers: string[] = []
  const text = $('.entry-content').text()
  // Find text after ANSWERS heading
  const block = text.match(/\banswers?\b[:\s\n]+([\s\S]{1,1200}?)(?:\n{3,}|$)/i)?.[1] ?? ''
  for (const line of block.split('\n').map(l => l.trim()).filter(Boolean)) {
    const m = line.match(/^(\d+)[.)]\s+(.+)/)
    if (m) answers.push(m[2].replace(/\s+/g, ' ').trim())
    else if (/^(TRUE|FALSE|NOT GIVEN|YES|NO|[A-H])$/i.test(line)) answers.push(line.toUpperCase())
  }
  return answers
}

function extractQuestions($: cheerio.CheerioAPI, qType: string): Question[] {
  const answers = extractAnswers($)
  const qs: Question[] = []
  let idx = 0

  if (qType === 'true_false_ng') {
    // TF/NG questions are usually in ol/li or numbered paragraphs
    $('.entry-content ol li, .entry-content p').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      // Numbered items or items that look like statements (not questions)
      const numbered = text.match(/^(?:\d+[.)]\s+)?(.{15,250})$/)
      if (numbered && !/^(passage|click|note:|tip:|answer)/i.test(text)) {
        qs.push({ index: idx, text: numbered[1], answer: answers[idx] || '' })
        idx++
        if (idx >= 15) return false
      }
    })
  } else if (qType === 'matching_headings') {
    $('ol li').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (text.length > 5) {
        qs.push({ index: idx, text, answer: answers[idx] || '', paragraph: String.fromCharCode(65 + idx) })
        idx++
      }
    })
  } else {
    // Generic: numbered ol items
    $('.entry-content ol li').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ')
      if (text.length > 5 && text.length < 400) {
        qs.push({ index: idx, text, answer: answers[idx] || '' })
        idx++
      }
    })
    // Fallback: numbered paragraphs
    if (qs.length === 0) {
      $('.entry-content p').each((_, el) => {
        const text = $(el).text().trim()
        const m = text.match(/^(\d+)[.)]\s+(.{5,300})/)
        if (m) {
          qs.push({ index: idx, text: m[2].replace(/\s+/g, ' '), answer: answers[idx] || '' })
          idx++
        }
      })
    }
  }

  // Preserve answers even if question text wasn't found
  while (idx < answers.length && idx < 20) {
    qs.push({ index: idx, text: `Question ${idx + 1}`, answer: answers[idx] })
    idx++
  }

  return qs.slice(0, 40)
}

export async function scrapeReading(): Promise<ReadingExercise[]> {
  const exercises: ReadingExercise[] = []

  for (const url of EXERCISE_URLS) {
    try {
      const html = await get(url)
      const $ = cheerio.load(html)
      const title = $('h1').first().text().trim()
      const passage = extractPassage($)
      const qType = questionType(title + ' ' + url + ' ' + $('.entry-content').text().slice(0, 500))
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
